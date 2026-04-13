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

// ── WASM error codes (LibreDWG bitmask) ──────────────────────────────────────
//
// LibreDWG uses OR-combined bitmask error codes. The values below are the
// individual bit meanings defined in the LibreDWG C headers (dwg.h).
// Error code 64 = DWG_ERR_VALUEOUTOFBOUNDS — a value in the file exceeded
// the expected range during parsing. This is a common non-fatal warning on
// AC1024 (AutoCAD 2010) files but indicates that some entities may not have
// parsed correctly. Any non-zero error means the data is at best partial.
//
// Fatal threshold: errors >= DWG_ERR_INVALIDDWG (2048) mean the file
// structure itself could not be decoded at all.
const DWG_ERR_VALUEOUTOFBOUNDS = 64

/**
 * Translates a LibreDWG bitmask error code into a human-readable string.
 * This is displayed instead of the raw numeric code so users understand what
 * went wrong without needing to consult LibreDWG source code.
 */
function dwgErrorMessage(code: number): string {
  if (code === 0) return ''
  const parts: string[] = []
  if (code & 1)    parts.push('CRC mismatch')
  if (code & 2)    parts.push('unsupported DWG version feature')
  if (code & 4)    parts.push('unhandled entity class')
  if (code & 8)    parts.push('invalid entity type')
  if (code & 16)   parts.push('invalid handle reference')
  if (code & 32)   parts.push('invalid extended entity data')
  if (code & 64)   parts.push('value out of bounds (AC1024/R2010 subformat)')
  if (code & 128)  parts.push('class section not found')
  if (code & 256)  parts.push('section not found')
  if (code & 512)  parts.push('page not found')
  if (code & 1024) parts.push('internal WASM error')
  if (code & 2048) parts.push('invalid DWG file structure')
  if (code & 4096) parts.push('I/O error reading file')
  if (code & 8192) parts.push('out of memory')
  return parts.length > 0 ? parts.join('; ') : `unknown error (code ${code})`
}

/**
 * Low-level DWG read helper that uses the raw WASM module (createModule) so
 * we can inspect result.error before deciding whether to proceed. The higher-
 * level LibreDwg wrapper logs the error and returns partial data anyway, which
 * causes confusing downstream crashes.
 *
 * Returns the parsed DwgDatabase ready for SVG conversion, or throws a
 * descriptive Error if parsing failed fatally or produced unusable data.
 */
async function readDwgToDatabase(arrayBuffer: ArrayBuffer) {
  const { createModule, LibreDwg } = await import('@mlightcad/libredwg-web')

  // Use the raw WASM module so we can check result.error directly
  const wasm = await createModule()
  const fileName = 'tmp.dwg'
  wasm.FS.writeFile(fileName, new Uint8Array(arrayBuffer))
  const result = wasm.dwg_read_file(fileName)
  wasm.FS.unlink(fileName)

  const errorCode: number = result.error ?? 0
  const dataPtr = result.data

  // Any error means the data is at best partial. Fatal errors (>= 2048 =
  // DWG_ERR_INVALIDDWG) mean the file is corrupt; lower codes (like 64 =
  // DWG_ERR_VALUEOUTOFBOUNDS) typically mean an incompatible DWG subversion
  // and will cause convert() to crash later anyway.
  if (errorCode !== 0 || dataPtr == null) {
    const detail = dwgErrorMessage(errorCode)
    if (errorCode & DWG_ERR_VALUEOUTOFBOUNDS) {
      throw new Error(
        `DWG file uses an AC1024/R2010 feature that is not fully supported ` +
        `by the browser renderer (${detail}).`,
      )
    }
    if (errorCode !== 0) {
      throw new Error(`DWG parsing failed: ${detail}.`)
    }
    throw new Error('DWG parsing returned no data.')
  }

  // Build a LibreDwg wrapper around the WASM instance we already created so
  // we can call convert() and dwg_to_svg() without re-initialising WASM.
  // LibreDwg.createByWasmInstance is a static helper that reuses the instance.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const libredwg = (LibreDwg as any).createByWasmInstance(wasm)
  const db = libredwg.convert(dataPtr)
  libredwg.dwg_free(dataPtr)
  return { libredwg, db }
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

    const { libredwg, db } = await readDwgToDatabase(arrayBuffer)

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
  // Sanitized SVG is stored in state so it can be injected after React renders
  // the eng-svg-container div (containerRef is null while status === 'loading').
  const [svgContent, setSvgContent] = useState<string>('')

  // ── Async WASM render effect ──────────────────────────────────────────────
  // Fetches the DWG, runs the WASM renderer, and stores the sanitized SVG in
  // state. Does NOT touch the DOM directly — DOM injection is handled by the
  // separate injection effect below (which runs after React has committed the
  // eng-svg-container div to the DOM and containerRef is populated).
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setSvgContent('')

    ;(async () => {
      try {
        // Fetch raw DWG bytes (with auth headers — endpoint requires authentication)
        const arrayBuffer = await fetchDwgBytes(id)
        if (cancelled) return

        // readDwgToDatabase uses the raw WASM module so it can inspect
        // result.error and throw a descriptive message instead of silently
        // continuing with partial data (which would crash downstream and
        // expose raw "error code: 64" messages to the user).
        const { libredwg, db } = await readDwgToDatabase(arrayBuffer)
        if (cancelled) return

        const rawSvg = libredwg.dwg_to_svg(db)
        // Sanitize the WASM-rendered SVG before DOM insertion to prevent XSS
        // from maliciously crafted DWG files (see sanitizeSvg above).
        const safeSvg = sanitizeSvg(rawSvg)

        if (!cancelled) {
          setSvgContent(safeSvg)
          setStatus('ok')
        }
      } catch (err) {
        console.warn('DWG render error:', err)
        if (!cancelled) setStatus('error')
      }
    })()

    return () => { cancelled = true }
  }, [id])

  // ── SVG injection effect ──────────────────────────────────────────────────
  // Runs after status becomes 'ok' and React commits the eng-svg-container div.
  // At this point containerRef.current is populated and we can safely set innerHTML.
  useEffect(() => {
    if (status !== 'ok' || !svgContent || !containerRef.current) return
    containerRef.current.innerHTML = svgContent
    // Make the embedded SVG fill the container
    const svgEl = containerRef.current.querySelector('svg')
    if (svgEl) {
      svgEl.style.width = '100%'
      svgEl.style.height = '100%'
    }
  }, [status, svgContent])

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

// ── DWG date-patching helpers ─────────────────────────────────────────────────

type DateCandidate = { offset: number; date: string; julian: number }

function fmtIso(iso: string): string {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

// ── Dates in File panel ───────────────────────────────────────────────────────

function DatesInFilePanel({ fileId }: { fileId: number }) {
  const { t } = useTranslation()
  const [scanning, setScanning]     = useState(false)
  const [candidates, setCandidates] = useState<DateCandidate[] | null>(null)
  const [scanError, setScanError]   = useState<string | null>(null)
  const [newDate, setNewDate]       = useState('')
  const [patching, setPatching]     = useState(false)
  const [patchMsg, setPatchMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  async function handleScan() {
    setScanning(true)
    setScanError(null)
    setCandidates(null)
    setPatchMsg(null)
    try {
      const user = getCurrentUser()
      const headers: HeadersInit = user
        ? { 'x-user-role': user.role, 'x-user-id': String(user.id), 'x-user-name': user.name }
        : {}
      const res = await fetch(`/api/engineering/${fileId}/dates`, { headers })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        let msg = txt
        try { msg = (JSON.parse(txt) as { error?: string }).error ?? txt } catch { /* raw */ }
        setScanError(msg || `Scan failed (HTTP ${res.status})`)
        return
      }
      const data = (await res.json()) as { candidates: DateCandidate[] }
      setCandidates(data.candidates)
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  async function handlePatch() {
    if (!candidates || candidates.length === 0 || !newDate) return
    setPatching(true)
    setPatchMsg(null)
    try {
      const user = getCurrentUser()
      const headers: HeadersInit = user
        ? {
            'x-user-role': user.role,
            'x-user-id': String(user.id),
            'x-user-name': user.name,
            'Content-Type': 'application/json',
          }
        : { 'Content-Type': 'application/json' }
      const offsets = candidates.map(c => c.offset)
      const res = await fetch(`/api/engineering/${fileId}/patch-dates`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ offsets, newDate }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        let msg = txt
        try { msg = (JSON.parse(txt) as { error?: string }).error ?? txt } catch { /* raw */ }
        setPatchMsg({ ok: false, text: `${t('dwgPatchError')}: ${msg}` })
        return
      }
      setPatchMsg({ ok: true, text: t('dwgPatchSuccess') })
      // Re-scan to show updated dates
      void handleScan()
    } catch (e) {
      setPatchMsg({ ok: false, text: e instanceof Error ? e.message : t('dwgPatchError') })
    } finally {
      setPatching(false)
    }
  }

  return (
    <div className="eng-meta-section">
      <p className="eng-meta-section-title">{t('dwgDatesInFile')}</p>

      <button
        className="btn eng-save-btn"
        onClick={() => { void handleScan() }}
        disabled={scanning}
        style={{ marginBottom: '0.75rem' }}
      >
        {scanning ? '…' : t('dwgScanDates')}
      </button>

      {scanError && (
        <p className="eng-error" style={{ marginBottom: '0.5rem' }}>{scanError}</p>
      )}

      {candidates !== null && candidates.length === 0 && (
        <p className="eng-meta-value" style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
          {t('dwgNoDatesFound')}
        </p>
      )}

      {candidates !== null && candidates.length > 0 && (
        <>
          <p className="eng-meta-value" style={{ marginBottom: '0.5rem' }}>
            {t('dwgFoundDates').replace('{n}', String(candidates.length))}
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '2px 6px', color: 'var(--color-text-muted)' }}>Offset</th>
                <th style={{ textAlign: 'left', padding: '2px 6px', color: 'var(--color-text-muted)' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.offset}>
                  <td style={{ padding: '2px 6px', fontFamily: 'monospace' }}>{c.offset}</td>
                  <td style={{ padding: '2px 6px' }}>{fmtIso(c.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="eng-meta-field">
            <label className="eng-field-label">{t('dwgPatchDate')}</label>
            <input
              className="eng-input"
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
            />
          </div>

          {newDate && (
            <p className="eng-patch-warning" style={{
              background: 'rgba(220,120,0,0.12)',
              border: '1px solid rgba(220,120,0,0.4)',
              borderRadius: '4px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              marginBottom: '0.5rem',
            }}>
              ⚠ {t('dwgPatchWarning')}
            </p>
          )}

          <button
            className="btn eng-save-btn"
            onClick={() => { void handlePatch() }}
            disabled={patching || !newDate}
          >
            {patching ? '…' : t('dwgPatchFile')}
          </button>

          {patchMsg && (
            <p style={{
              marginTop: '0.5rem',
              color: patchMsg.ok ? 'var(--color-success, #4caf50)' : 'var(--color-error, #f44)',
              fontSize: '0.85rem',
            }}>
              {patchMsg.text}
            </p>
          )}
        </>
      )}
    </div>
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

      {/* Dates in File section */}
      <DatesInFilePanel fileId={file.id} />
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

// ── Entity diff panel ─────────────────────────────────────────────────────────

interface EntitySummary {
  type: string
  layer: string
  key: string
  data: Record<string, unknown>
}

interface EntityDiffResult {
  available: true
  added: EntitySummary[]
  removed: EntitySummary[]
  total: { a: number; b: number }
  summary: {
    addedCount: number
    removedCount: number
    unchangedCount: number
  }
}

interface EntityDiffUnavailable {
  available: false
  reason: string
}

type EntityDiffResponse = EntityDiffResult | EntityDiffUnavailable

type EntityDiffState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'unavailable'; reason: string }
  | { phase: 'error'; message: string }
  | { phase: 'done'; result: EntityDiffResult }

const ENTITY_DISPLAY_CAP = 50

async function fetchEntityDiff(idA: number, idB: number): Promise<EntityDiffState> {
  const user = getCurrentUser()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(user ? { 'x-user-role': user.role, 'x-user-id': String(user.id), 'x-user-name': user.name } : {}),
  }
  const res = await fetch('/api/engineering/entity-diff', {
    method: 'POST',
    headers,
    body: JSON.stringify({ idA, idB }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    let msg = txt
    try { msg = (JSON.parse(txt) as { error?: string }).error ?? txt } catch { /* raw */ }
    return { phase: 'error', message: msg || `HTTP ${res.status}` }
  }
  const data = (await res.json()) as EntityDiffResponse
  if (!data.available) {
    return { phase: 'unavailable', reason: (data as EntityDiffUnavailable).reason }
  }
  return { phase: 'done', result: data as EntityDiffResult }
}

function EntityDiffPanel({ idA, idB }: { idA: number; idB: number }) {
  const { t } = useTranslation()
  const [state, setState] = useState<EntityDiffState>({ phase: 'loading' })

  useEffect(() => {
    let cancelled = false

    fetchEntityDiff(idA, idB)
      .then(result => { if (!cancelled) setState(result) })
      .catch(e => { if (!cancelled) setState({ phase: 'error', message: e instanceof Error ? e.message : 'Request failed' }) })

    return () => { cancelled = true }
  }, [idA, idB])

  return (
    <div className="eng-entity-diff">
      <p className="eng-entity-diff-title">{t('dwgEntityDiff')}</p>

      {state.phase === 'loading' && (
        <div className="eng-compare-loading">
          <span className="eng-drop-spinner" />
          <span>{t('dwgEntityDiffLoading')}</span>
        </div>
      )}

      {state.phase === 'unavailable' && (
        <div className="eng-entity-unavailable">
          {t('dwgEntityDiffUnavailable')}
        </div>
      )}

      {state.phase === 'error' && (
        <p className="eng-error">{state.message}</p>
      )}

      {state.phase === 'done' && (() => {
        const { result } = state
        const { addedCount, removedCount, unchangedCount } = result.summary

        if (addedCount === 0 && removedCount === 0) {
          return (
            <div className="eng-entity-unavailable" style={{ borderColor: 'rgba(74,222,128,.2)', color: '#4ade80' }}>
              {t('dwgEntityIdentical')}
            </div>
          )
        }

        const summaryText = t('dwgEntitySummary')
          .replace('{a}',         String(result.total.a))
          .replace('{added}',     String(addedCount))
          .replace('{removed}',   String(removedCount))
          .replace('{unchanged}', String(unchangedCount))

        const addedDisplay   = result.added.slice(0, ENTITY_DISPLAY_CAP)
        const removedDisplay = result.removed.slice(0, ENTITY_DISPLAY_CAP)
        const addedRemainder   = addedCount   - addedDisplay.length
        const removedRemainder = removedCount - removedDisplay.length

        return (
          <>
            <div className="eng-entity-summary">{summaryText}</div>
            <div className="eng-entity-cols">
              {/* Added column */}
              <div>
                <p className="eng-entity-col-title eng-entity-col-title--added">
                  +{addedCount} {t('dwgEntityAdded')}
                </p>
                {addedDisplay.map((e, i) => (
                  <div key={e.key + i} className="eng-entity-row">
                    <span className="eng-entity-type">{e.type}</span>
                    <span className="eng-entity-layer">{e.layer}</span>
                  </div>
                ))}
                {addedRemainder > 0 && (
                  <p className="eng-entity-layer" style={{ marginTop: '.35rem' }}>
                    {t('dwgEntityMore').replace('{n}', String(addedRemainder))}
                  </p>
                )}
              </div>

              {/* Removed column */}
              <div>
                <p className="eng-entity-col-title eng-entity-col-title--removed">
                  -{removedCount} {t('dwgEntityRemoved')}
                </p>
                {removedDisplay.map((e, i) => (
                  <div key={e.key + i} className="eng-entity-row">
                    <span className="eng-entity-type">{e.type}</span>
                    <span className="eng-entity-layer">{e.layer}</span>
                  </div>
                ))}
                {removedRemainder > 0 && (
                  <p className="eng-entity-layer" style={{ marginTop: '.35rem' }}>
                    {t('dwgEntityMore').replace('{n}', String(removedRemainder))}
                  </p>
                )}
              </div>
            </div>
          </>
        )
      })()}
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

          {/* Entity diff — loads independently from the pixel diff */}
          {fileAId !== '' && fileBId !== '' && (
            <EntityDiffPanel idA={fileAId as number} idB={fileBId as number} />
          )}
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
