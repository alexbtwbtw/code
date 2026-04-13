import { useState, useRef, useEffect, useCallback } from 'react'
import pixelmatch from 'pixelmatch'
import { useTranslation } from '../i18n/context'
import { useDwgFiles, useUpdateDwgFile, useDeleteDwgFile, downloadDwg, fetchDwgBytes } from '../api/engineering'
import { useCurrentUser, getCurrentUser } from '../auth'

// ── SVG Sanitizer ─────────────────────────────────────────────────────────────
//
// The WASM DWG renderer produces SVG from a binary format it parses in a WASM
// sandbox. If a maliciously crafted DWG embeds script payloads in metadata
// strings (layer names, entity text, etc.), those strings could end up in the
// SVG output. Inserting that SVG via innerHTML without sanitization would give
// the malicious content a direct path to XSS.
//
// We use a lightweight allowlist-based sanitizer rather than a heavy library
// (DOMPurify) so there is no extra bundle dependency. The sanitizer:
//   1. Parses the SVG in an off-screen DOMParser (no script execution occurs).
//   2. Walks every element and removes any that are not on the SVG shape
//      allowlist (e.g. <script>, <foreignObject>, <use> with external refs).
//   3. Removes every attribute that is not on the per-element allowlist and
//      strips any attribute whose value begins with "javascript:".
//
// Risk residual (Low): A sufficiently sophisticated attacker could in theory
// craft a DWG whose metadata exploits a browser HTML-parser quirk to bypass
// this sanitizer. For an internal engineering tool this risk is acceptable.
// If the app ever becomes internet-facing, replace with DOMPurify.

const SVG_ELEMENTS_ALLOWLIST = new Set([
  'svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'path', 'text', 'tspan', 'defs', 'symbol', 'use', 'linearGradient',
  'radialGradient', 'stop', 'clipPath', 'mask', 'pattern', 'marker',
  'title', 'desc',
])

const SVG_ATTRS_ALLOWLIST = new Set([
  'id', 'class', 'style', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'opacity',
  'fill-opacity', 'stroke-opacity', 'transform', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'd', 'points',
  'viewBox', 'preserveAspectRatio', 'xmlns', 'version', 'font-size',
  'font-family', 'text-anchor', 'dominant-baseline', 'clip-path',
  'marker-start', 'marker-mid', 'marker-end',
  'gradientUnits', 'gradientTransform', 'spreadMethod',
  'x1', 'y1', 'x2', 'y2', 'fx', 'fy',
  'offset', 'stop-color', 'stop-opacity',
  'patternUnits', 'patternTransform', 'patternContentUnits',
  'clipPathUnits', 'maskUnits', 'maskContentUnits',
  'markerWidth', 'markerHeight', 'markerUnits', 'orient', 'refX', 'refY',
  'href',   // allowed only with non-external refs (enforced below)
  'xlink:href',
])

function sanitizeSvg(svgString: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgString, 'image/svg+xml')

  // DOMParser signals parse errors with a <parsererror> root
  if (doc.documentElement.tagName === 'parsererror') {
    return ''
  }

  const root = doc.documentElement

  function walkNode(node: Element) {
    const tag = node.tagName.toLowerCase().replace(/^svg:/, '')

    // Remove disallowed elements entirely (including <script>, <foreignObject>, etc.)
    if (!SVG_ELEMENTS_ALLOWLIST.has(tag)) {
      node.parentNode?.removeChild(node)
      return
    }

    // Sanitize attributes
    const attrsToRemove: string[] = []
    for (const attr of Array.from(node.attributes)) {
      const name  = attr.name.toLowerCase()
      const value = attr.value.toLowerCase().trim()

      // Strip all event handlers (onclick, onload, …)
      if (name.startsWith('on')) { attrsToRemove.push(attr.name); continue }

      // Strip javascript: URIs
      if (value.replace(/\s/g, '').startsWith('javascript:')) {
        attrsToRemove.push(attr.name); continue
      }

      // Strip data: URIs (can embed scripts in some contexts)
      if (value.replace(/\s/g, '').startsWith('data:')) {
        attrsToRemove.push(attr.name); continue
      }

      // For href / xlink:href, allow only same-document fragment references (#id)
      if ((name === 'href' || name === 'xlink:href') && !attr.value.startsWith('#')) {
        attrsToRemove.push(attr.name); continue
      }

      // Strip attributes not on the allowlist
      if (!SVG_ATTRS_ALLOWLIST.has(name)) {
        attrsToRemove.push(attr.name)
      }
    }
    attrsToRemove.forEach(a => node.removeAttribute(a))

    // Recurse into children (collect first to avoid live-NodeList mutation issues)
    Array.from(node.children).forEach(walkNode)
  }

  walkNode(root)

  return new XMLSerializer().serializeToString(root)
}

// ── Types ─────────────────────────────────────────────────────────────────────

type DwgFile = {
  id: number
  projectId: number | null
  fileName: string
  displayName: string
  notes: string
  customDate: string | null
  dwgVersion: string | null
  fileSize: number
  uploadedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString() } catch { return iso }
}

// ── WASM render helper ────────────────────────────────────────────────────────

/**
 * Renders a DWG file to an HTML canvas via the libredwg-web WASM module.
 * Returns the canvas on success, or null if rendering fails (e.g. unsupported
 * DWG version). Uses dynamic import so the heavy WASM bundle is only loaded
 * when Compare is actually triggered.
 */
async function renderDwgToCanvas(
  id: number,
  width = 1200,
  height = 900,
): Promise<HTMLCanvasElement | null> {
  try {
    const arrayBuffer = await fetchDwgBytes(id)

    // Dynamic import keeps the WASM bundle out of the initial chunk
    const { LibreDwg, Dwg_File_Type } = await import('@mlightcad/libredwg-web')

    const libredwg = await LibreDwg.create()
    const dataPtr  = libredwg.dwg_read_data(arrayBuffer, Dwg_File_Type.DWG)
    if (dataPtr == null) throw new Error('Failed to read DWG data')

    const db  = libredwg.convert(dataPtr)
    libredwg.dwg_free(dataPtr)

    const rawSvg  = libredwg.dwg_to_svg(db)
    const safeSvg = sanitizeSvg(rawSvg)
    if (!safeSvg) throw new Error('SVG sanitization produced empty output')

    // Render SVG → canvas via an off-screen <img>
    const blob = new Blob([safeSvg], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)

    return await new Promise<HTMLCanvasElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('No 2d context')); return }
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        resolve(canvas)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('SVG image failed to load'))
      }
      img.src = url
    })
  } catch (err) {
    console.warn(`DWG render failed for id=${id}:`, err)
    return null
  }
}

// ── DWG Viewer ────────────────────────────────────────────────────────────────

function DwgViewerPane({ id }: { id: number }) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    ;(async () => {
      try {
        // Fetch raw DWG bytes (with auth headers — endpoint requires authentication)
        const arrayBuffer = await fetchDwgBytes(id)

        // Dynamically import to avoid bundler issues with WASM
        const { LibreDwg, Dwg_File_Type } = await import('@mlightcad/libredwg-web')
        if (cancelled) return

        const libredwg = await LibreDwg.create()
        if (cancelled) return

        const dataPtr = libredwg.dwg_read_data(arrayBuffer, Dwg_File_Type.DWG)
        if (dataPtr == null) throw new Error('Failed to read DWG data')

        const db = libredwg.convert(dataPtr)
        libredwg.dwg_free(dataPtr)

        const svg = libredwg.dwg_to_svg(db)

        if (!cancelled && containerRef.current) {
          // Sanitize the WASM-rendered SVG before DOM insertion to prevent XSS
          // from maliciously crafted DWG files (see sanitizeSvg above).
          containerRef.current.innerHTML = sanitizeSvg(svg)
          // Make the embedded SVG responsive
          const svgEl = containerRef.current.querySelector('svg')
          if (svgEl) {
            svgEl.style.width = '100%'
            svgEl.style.height = '100%'
          }
          setStatus('ok')
        }
      } catch (err) {
        console.warn('DWG render error:', err)
        if (!cancelled) setStatus('error')
      }
    })()

    return () => { cancelled = true }
  }, [id])

  if (status === 'loading') {
    return (
      <div className="eng-viewer-placeholder">
        <span className="eng-drop-spinner" />
        <span>{t('loading')}</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="eng-viewer-placeholder eng-viewer-placeholder--error">
        <div className="eng-viewer-error-body">
          <span className="eng-viewer-error-icon">⚠</span>
          <span className="eng-viewer-error-title">{t('dwgPreviewUnavailable')}</span>
          <span className="eng-viewer-error-hint">{t('dwgPreviewUnavailableHint')}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="eng-svg-container"
    />
  )
}

// ── Metadata + Edit panel ─────────────────────────────────────────────────────

function MetadataPanel({ file }: { file: DwgFile }) {
  const { t } = useTranslation()
  const updateMutation = useUpdateDwgFile()

  const [displayName, setDisplayName] = useState(file.displayName)
  const [notes, setNotes]             = useState(file.notes)
  const [customDate, setCustomDate]   = useState(file.customDate ?? '')
  const [saved, setSaved]             = useState(false)

  function handleSave() {
    updateMutation.mutate(
      {
        id: file.id,
        displayName,
        notes,
        customDate: customDate || null,
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        },
      },
    )
  }

  return (
    <div className="eng-meta-panel">
      {/* Read-only info */}
      <div className="eng-meta-section">
        <div className="eng-meta-row">
          <span className="eng-meta-label">{t('dwgFileName')}</span>
          <span className="eng-meta-value">{file.fileName}</span>
        </div>
        {file.dwgVersion && (
          <div className="eng-meta-row">
            <span className="eng-meta-label">{t('dwgVersion')}</span>
            <span className="eng-meta-value">
              <span className="eng-version-badge">AutoCAD {file.dwgVersion}</span>
            </span>
          </div>
        )}
        <div className="eng-meta-row">
          <span className="eng-meta-label">{t('dwgFileSize')}</span>
          <span className="eng-meta-value">{fmtSize(file.fileSize)}</span>
        </div>
        <div className="eng-meta-row">
          <span className="eng-meta-label">{t('dwgUploadedAt')}</span>
          <span className="eng-meta-value">{fmtDate(file.uploadedAt)}</span>
        </div>
      </div>

      {/* Editable fields */}
      <div className="eng-meta-section">
        <p className="eng-meta-section-title">{t('dwgEditInfo')}</p>

        <div className="eng-meta-field">
          <label className="eng-field-label">{t('dwgDisplayName')}</label>
          <input
            className="eng-input"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
          />
        </div>

        <div className="eng-meta-field">
          <label className="eng-field-label">{t('dwgDrawingDate')}</label>
          <input
            className="eng-input"
            type="date"
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
          />
        </div>

        <div className="eng-meta-field">
          <label className="eng-field-label">{t('dwgNotes')}</label>
          <textarea
            className="eng-textarea"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <button
          className={`btn eng-save-btn${saved ? ' eng-save-btn--saved' : ''}`}
          onClick={handleSave}
          disabled={updateMutation.isPending || saved}
        >
          {saved ? `✓ ${t('dwgSaved')}` : t('dwgSave')}
        </button>
      </div>
    </div>
  )
}

// ── Upload area ───────────────────────────────────────────────────────────────

function UploadArea({ onUploaded }: { onUploaded: () => void }) {
  const { t } = useTranslation()
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function doUpload(file: File) {
    setError(null)
    setUploading(true)
    try {
      const user = getCurrentUser()
      const headers: HeadersInit = user
        ? { 'x-user-role': user.role, 'x-user-id': String(user.id), 'x-user-name': user.name }
        : {}
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/engineering/upload', { method: 'POST', body: fd, headers })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let msg = text
        try { msg = (JSON.parse(text) as { error?: string }).error ?? text } catch { /* raw text */ }
        setError(msg || `Upload failed (HTTP ${res.status})`)
        return
      }
      onUploaded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    void doUpload(files[0])
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="eng-upload-wrap">
      <div
        className={`eng-drop-zone${dragging ? ' eng-drop-zone--drag' : ''}${uploading ? ' eng-drop-zone--uploading' : ''}`}
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="eng-drop-uploading">
            <span className="eng-drop-spinner" />
            <span>{t('uploadDwg')}…</span>
          </div>
        ) : (
          <div className="eng-drop-inner">
            <span className="eng-drop-icon">⬆</span>
            <span className="eng-drop-label">{t('dwgDrop')}</span>
            <span className="eng-drop-hint">{t('dwgDropHint')}</span>
          </div>
        )}
      </div>
      {error && <p className="eng-error">{error}</p>}
    </div>
  )
}

// ── Compare tab ───────────────────────────────────────────────────────────────

type CompareState =
  | { phase: 'idle' }
  | { phase: 'rendering' }
  | { phase: 'done'; canvasA: HTMLCanvasElement; canvasB: HTMLCanvasElement; diffCanvas: HTMLCanvasElement; numDiff: number; pct: string }
  | { phase: 'error'; message: string }

const COMPARE_WIDTH  = 1200
const COMPARE_HEIGHT = 900

function CompareTab({ files }: { files: DwgFile[] }) {
  const { t } = useTranslation()
  const [fileAId, setFileAId] = useState<number | ''>('')
  const [fileBId, setFileBId] = useState<number | ''>('')
  const [state, setState]     = useState<CompareState>({ phase: 'idle' })

  // Canvas refs for mounting rendered canvases into the DOM
  const mountARef    = useRef<HTMLDivElement>(null)
  const mountBRef    = useRef<HTMLDivElement>(null)
  const mountDiffRef = useRef<HTMLDivElement>(null)

  // Mount canvases after state becomes 'done'
  useEffect(() => {
    if (state.phase !== 'done') return
    function mountCanvas(container: HTMLDivElement | null, canvas: HTMLCanvasElement) {
      if (!container) return
      container.innerHTML = ''
      canvas.setAttribute('class', 'eng-compare-canvas')
      container.appendChild(canvas)
    }
    mountCanvas(mountARef.current, state.canvasA)
    mountCanvas(mountBRef.current, state.canvasB)
    mountCanvas(mountDiffRef.current, state.diffCanvas)
  }, [state])

  const handleCompare = useCallback(async () => {
    if (fileAId === '' || fileBId === '') return
    if (fileAId === fileBId) return

    setState({ phase: 'rendering' })
    try {
      const [canvasA, canvasB] = await Promise.all([
        renderDwgToCanvas(fileAId as number, COMPARE_WIDTH, COMPARE_HEIGHT),
        renderDwgToCanvas(fileBId as number, COMPARE_WIDTH, COMPARE_HEIGHT),
      ])

      const fileA = files.find(f => f.id === fileAId)
      const fileB = files.find(f => f.id === fileBId)

      if (!canvasA) {
        setState({ phase: 'error', message: `Preview unavailable for ${fileA?.displayName ?? 'File A'} — comparison not possible` })
        return
      }
      if (!canvasB) {
        setState({ phase: 'error', message: `Preview unavailable for ${fileB?.displayName ?? 'File B'} — comparison not possible` })
        return
      }

      const ctx1 = canvasA.getContext('2d')!
      const ctx2 = canvasB.getContext('2d')!

      const diffCanvas        = document.createElement('canvas')
      diffCanvas.width        = COMPARE_WIDTH
      diffCanvas.height       = COMPARE_HEIGHT
      const ctxDiff           = diffCanvas.getContext('2d')!

      const imgData1 = ctx1.getImageData(0, 0, COMPARE_WIDTH, COMPARE_HEIGHT)
      const imgData2 = ctx2.getImageData(0, 0, COMPARE_WIDTH, COMPARE_HEIGHT)
      const diffData = ctxDiff.createImageData(COMPARE_WIDTH, COMPARE_HEIGHT)

      const numDiff = pixelmatch(
        imgData1.data,
        imgData2.data,
        diffData.data,
        COMPARE_WIDTH,
        COMPARE_HEIGHT,
        { threshold: 0.1 },
      )
      ctxDiff.putImageData(diffData, 0, 0)

      const totalPixels = COMPARE_WIDTH * COMPARE_HEIGHT
      const pct = ((numDiff / totalPixels) * 100).toFixed(2)

      setState({ phase: 'done', canvasA, canvasB, diffCanvas, numDiff, pct })
    } catch (err) {
      console.error('Compare error:', err)
      setState({ phase: 'error', message: err instanceof Error ? err.message : 'Comparison failed' })
    }
  }, [fileAId, fileBId, files])

  if (files.length < 2) {
    return <div className="eng-compare-info">{t('dwgCompareNoFiles')}</div>
  }

  const sameSelected = fileAId !== '' && fileBId !== '' && fileAId === fileBId

  return (
    <div>
      {/* Selectors */}
      <div className="eng-compare-selectors">
        <label>
          <span className="eng-field-label">{t('dwgCompareFileA')}</span>
          <select
            value={fileAId}
            onChange={e => { setFileAId(e.target.value === '' ? '' : Number(e.target.value)); setState({ phase: 'idle' }) }}
          >
            <option value="">—</option>
            {files.map(f => (
              <option key={f.id} value={f.id}>{f.displayName}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="eng-field-label">{t('dwgCompareFileB')}</span>
          <select
            value={fileBId}
            onChange={e => { setFileBId(e.target.value === '' ? '' : Number(e.target.value)); setState({ phase: 'idle' }) }}
          >
            <option value="">—</option>
            {files.map(f => (
              <option key={f.id} value={f.id}>{f.displayName}</option>
            ))}
          </select>
        </label>

        <button
          className="btn eng-save-btn"
          style={{ width: 'auto', marginTop: 0 }}
          onClick={() => { void handleCompare() }}
          disabled={fileAId === '' || fileBId === '' || sameSelected || state.phase === 'rendering'}
        >
          {t('dwgCompareBtn')}
        </button>
      </div>

      {/* Same-file warning */}
      {sameSelected && (
        <div className="eng-compare-info">{t('dwgCompareSame')}</div>
      )}

      {/* Loading */}
      {state.phase === 'rendering' && (
        <div className="eng-compare-loading">
          <span className="eng-drop-spinner" />
          <span>{t('dwgCompareRendering')}</span>
        </div>
      )}

      {/* Error */}
      {state.phase === 'error' && (
        <div className="eng-compare-info eng-compare-summary--error">{state.message}</div>
      )}

      {/* Results */}
      {state.phase === 'done' && (
        <>
          <div className="eng-compare-panels">
            <div className="eng-compare-panel">
              <span className="eng-compare-label">{t('dwgCompareFileA')}</span>
              <div ref={mountARef} />
            </div>
            <div className="eng-compare-panel">
              <span className="eng-compare-label">Diff</span>
              <div ref={mountDiffRef} />
            </div>
            <div className="eng-compare-panel">
              <span className="eng-compare-label">{t('dwgCompareFileB')}</span>
              <div ref={mountBRef} />
            </div>
          </div>

          <div className={`eng-compare-summary${state.numDiff === 0 ? ' eng-compare-summary--identical' : ' eng-compare-summary--diff'}`}>
            {state.numDiff === 0
              ? t('dwgCompareIdentical')
              : t('dwgCompareResult').replace('{n}', state.numDiff.toLocaleString()).replace('{pct}', state.pct)
            }
          </div>
        </>
      )}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

type Tab = 'files' | 'compare'

export default function EngineeringTools() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { data: files = [], isLoading, refetch } = useDwgFiles()
  const deleteMutation = useDeleteDwgFile()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('files')

  function handleDelete(id: number) {
    if (!confirm(t('dwgDeleteConfirm'))) return
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        if (selectedId === id) setSelectedId(null)
      },
    })
  }

  return (
    <div className="view">
      {/* ── Hero header ── */}
      <div className="time-report-hero">
        <div>
          <h1 className="time-report-hero-title">{t('engineering')}</h1>
          <p className="time-report-hero-sub">{t('dwgFiles')}</p>
        </div>
      </div>

      {/* ── Upload area ── */}
      <UploadArea onUploaded={() => { void refetch() }} />

      {/* ── Tab nav ── */}
      <div className="eng-tabs">
        <button
          className={`eng-tab${tab === 'files' ? ' eng-tab--active' : ''}`}
          onClick={() => setTab('files')}
        >
          {t('dwgFiles')}
        </button>
        <button
          className={`eng-tab${tab === 'compare' ? ' eng-tab--active' : ''}`}
          onClick={() => setTab('compare')}
        >
          {t('dwgCompareTab')}
        </button>
      </div>

      {/* ── Files tab ── */}
      {tab === 'files' && (
        <section className="time-report-section">
          <div className="time-report-section-header">
            <h2 className="time-report-section-title">{t('dwgFiles')}</h2>
            {files.length > 0 && (
              <span className="time-report-section-count">{files.length}</span>
            )}
          </div>

          {isLoading && (
            <div className="time-report-empty">
              <span className="eng-drop-spinner" />
              <span>{t('loading')}</span>
            </div>
          )}

          {!isLoading && files.length === 0 && (
            <div className="time-report-empty">
              <span className="time-report-empty-icon">📐</span>
              <div>
                <p>{t('dwgNoFiles')}</p>
                <p className="eng-empty-hint">{t('dwgNoFilesHint')}</p>
              </div>
            </div>
          )}

          {!isLoading && files.length > 0 && (
            <div className="eng-file-list">
              {files.map((file: DwgFile) => (
                <div key={file.id} className="eng-file-entry">
                  <div
                    className={`eng-file-row${selectedId === file.id ? ' eng-file-row--selected' : ''}`}
                    onClick={() => setSelectedId(selectedId === file.id ? null : file.id)}
                  >
                    <div className="eng-file-info">
                      <span className="eng-file-name">{file.displayName}</span>
                      <span className="eng-file-meta">
                        {file.dwgVersion && (
                          <span className="eng-version-badge">AC {file.dwgVersion}</span>
                        )}
                        <span>{fmtSize(file.fileSize)}</span>
                        <span>{fmtDate(file.uploadedAt)}</span>
                      </span>
                    </div>
                    <div className="eng-file-actions">
                      <button
                        className="eng-download-btn"
                        onClick={(e) => { e.stopPropagation(); void downloadDwg(file.id, file.fileName) }}
                        title={t('dwgDownload')}
                      >
                        {t('dwgDownload')}
                      </button>
                      {user && (
                        <button
                          className="eng-delete-btn"
                          onClick={(e) => { e.stopPropagation(); handleDelete(file.id) }}
                          title={t('dwgDelete')}
                          aria-label={t('dwgDelete')}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Inline expanded view ── */}
                  {selectedId === file.id && (
                    <div className="eng-expanded">
                      <div className="eng-viewer-col">
                        <DwgViewerPane id={file.id} />
                      </div>
                      <div className="eng-meta-col">
                        <MetadataPanel key={file.id} file={file} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Compare tab ── */}
      {tab === 'compare' && (
        <section className="time-report-section">
          <div className="time-report-section-header">
            <h2 className="time-report-section-title">{t('dwgCompare')}</h2>
          </div>
          {isLoading ? (
            <div className="time-report-empty">
              <span className="eng-drop-spinner" />
              <span>{t('loading')}</span>
            </div>
          ) : (
            <CompareTab files={files} />
          )}
        </section>
      )}
    </div>
  )
}
