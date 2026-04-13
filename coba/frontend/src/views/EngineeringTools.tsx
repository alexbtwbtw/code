import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../i18n/context'
import { useDwgFiles, useUpdateDwgFile, useDeleteDwgFile, downloadDwg } from '../api/engineering'
import { useCurrentUser } from '../auth'

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
        // Fetch raw DWG bytes
        const response = await fetch(`/api/engineering/${id}/dwg`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const arrayBuffer = await response.arrayBuffer()

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
          containerRef.current.innerHTML = svg
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
        <span>⚠ {t('dwgPreviewUnavailable')}</span>
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
        <label className="eng-field-label">{t('dwgDisplayName')}</label>
        <input
          className="eng-input"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
        />

        <label className="eng-field-label">{t('dwgDrawingDate')}</label>
        <input
          className="eng-input"
          type="date"
          value={customDate}
          onChange={e => setCustomDate(e.target.value)}
        />

        <label className="eng-field-label">{t('dwgNotes')}</label>
        <textarea
          className="eng-textarea"
          rows={4}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <button
          className="btn btn-primary eng-save-btn"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {saved ? '✓' : t('dwgSave')}
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
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/engineering/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? 'Upload failed')
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
    const file = files[0]
    if (!file.name.toLowerCase().endsWith('.dwg')) {
      setError('Only .dwg files are accepted')
      return
    }
    void doUpload(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div>
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
          accept=".dwg"
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
          </div>
        )}
      </div>
      {error && <p className="eng-error">{error}</p>}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function EngineeringTools() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { data: files = [], isLoading, refetch } = useDwgFiles()
  const deleteMutation = useDeleteDwgFile()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  function handleDelete(id: number) {
    if (!confirm('Delete this file?')) return
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

      {/* ── File list ── */}
      <div className="eng-file-list">
        {isLoading && <p className="muted">{t('loading')}</p>}
        {!isLoading && files.length === 0 && (
          <p className="muted">{t('dwgNoFiles')}</p>
        )}
        {files.map((file: DwgFile) => (
          <div key={file.id}>
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
                  onClick={(e) => { e.stopPropagation(); downloadDwg(file.id, file.fileName) }}
                  title={t('dwgDownload')}
                >
                  {t('dwgDownload')}
                </button>
                {user && (
                  <button
                    className="eng-delete-btn"
                    onClick={(e) => { e.stopPropagation(); handleDelete(file.id) }}
                    title={t('dwgDelete')}
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
    </div>
  )
}
