import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../i18n/context'
import { useDwgFiles, useDeleteDwgFile, useGetDxf, downloadDwg } from '../api/engineering'
import { useCurrentUser } from '../auth'
import { DxfViewer } from 'dxf-viewer'
import * as THREE from 'three'

// ── Types ─────────────────────────────────────────────────────────────────────

type DwgFile = {
  id: number
  projectId: number | null
  fileName: string
  version: string | null
  status: string
  errorMsg: string | null
  fileSize: number
  uploadedAt: string
}

// ── DXF Viewer component ───────────────────────────────────────────────────────

function DxfViewerPane({ dxfContent }: { dxfContent: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<InstanceType<typeof DxfViewer> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create viewer
    const viewer = new DxfViewer(containerRef.current, {
      autoResize: true,
      clearColor: new THREE.Color(0x1a2340),
      clearAlpha: 1,
      antialias: true,
      blackWhiteInversion: false,
    })
    viewerRef.current = viewer

    // Load DXF from a blob URL
    const blob = new Blob([dxfContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)

    viewer.Load({ url, fonts: null, workerFactory: null }).catch((err: unknown) => {
      console.error('DXF load error', err)
    }).finally(() => {
      URL.revokeObjectURL(url)
    })

    return () => {
      viewer.Destroy()
      viewerRef.current = null
    }
  }, [dxfContent])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '500px', borderRadius: '8px', overflow: 'hidden' }}
    />
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const label =
    status === 'ready'      ? t('dwgReady')
    : status === 'converting' ? t('dwgConverting')
    : status === 'failed'     ? t('dwgFailed')
    : t('dwgPending')

  const cls =
    status === 'ready'      ? 'eng-badge eng-badge--ready'
    : status === 'converting' ? 'eng-badge eng-badge--converting'
    : status === 'failed'     ? 'eng-badge eng-badge--failed'
    : 'eng-badge eng-badge--pending'

  return <span className={cls}>{label}</span>
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
    doUpload(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() { setDragging(false) }

  return (
    <div>
      <div
        className={`eng-drop-zone${dragging ? ' eng-drop-zone--drag' : ''}${uploading ? ' eng-drop-zone--uploading' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
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
            <span className="eng-drop-label">{t('dropDwgHere')}</span>
          </div>
        )}
      </div>
      {error && <p className="eng-error">{error}</p>}
    </div>
  )
}

// ── Viewer panel (selected file) ──────────────────────────────────────────────

function ViewerPanel({ file }: { file: DwgFile }) {
  const { t } = useTranslation()
  const { data, isLoading } = useGetDxf(file.status === 'ready' ? file.id : null)

  if (file.status === 'converting' || file.status === 'pending') {
    return (
      <div className="eng-viewer-placeholder">
        <span className="eng-drop-spinner" />
        <span>{t('dwgConverting')}</span>
      </div>
    )
  }

  if (file.status === 'failed') {
    const msg = file.errorMsg?.includes('ODA File Converter not installed')
      ? t('noOdaConverter')
      : (file.errorMsg ?? t('dwgFailed'))
    return (
      <div className="eng-viewer-placeholder eng-viewer-placeholder--error">
        <span>⚠ {msg}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="eng-viewer-placeholder">
        <span className="eng-drop-spinner" />
        <span>{t('loading')}</span>
      </div>
    )
  }

  if (!data?.dxfContent) {
    return (
      <div className="eng-viewer-placeholder">
        <span>{t('dwgFailed')}</span>
      </div>
    )
  }

  return <DxfViewerPane dxfContent={data.dxfContent} />
}

// ── Compare tab ───────────────────────────────────────────────────────────────

function CompareTab({ files }: { files: DwgFile[] }) {
  const { t } = useTranslation()
  const readyFiles = files.filter(f => f.status === 'ready')
  const [fileAId, setFileAId] = useState<number | null>(null)
  const [fileBId, setFileBId] = useState<number | null>(null)
  const [comparing, setComparing] = useState(false)
  const [showCompare, setShowCompare] = useState(false)

  const fileA = readyFiles.find(f => f.id === fileAId) ?? null
  const fileB = readyFiles.find(f => f.id === fileBId) ?? null

  function handleCompare() {
    if (!fileA || !fileB) return
    setComparing(true)
    // Simulate async (in reality dxf-viewer loads async)
    setTimeout(() => {
      setComparing(false)
      setShowCompare(true)
    }, 500)
  }

  return (
    <div className="eng-compare">
      <div className="eng-compare-controls">
        <div className="eng-compare-select">
          <label className="eng-label">{t('selectFileA')}</label>
          <select
            className="eng-select"
            value={fileAId ?? ''}
            onChange={e => { setFileAId(Number(e.target.value) || null); setShowCompare(false) }}
          >
            <option value="">{t('selectFileA')}</option>
            {readyFiles.map(f => (
              <option key={f.id} value={f.id}>{f.fileName}</option>
            ))}
          </select>
        </div>
        <div className="eng-compare-select">
          <label className="eng-label">{t('selectFileB')}</label>
          <select
            className="eng-select"
            value={fileBId ?? ''}
            onChange={e => { setFileBId(Number(e.target.value) || null); setShowCompare(false) }}
          >
            <option value="">{t('selectFileB')}</option>
            {readyFiles.map(f => (
              <option key={f.id} value={f.id}>{f.fileName}</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary"
          disabled={!fileAId || !fileBId || fileAId === fileBId || comparing}
          onClick={handleCompare}
        >
          {comparing ? '…' : t('compareBtn')}
        </button>
      </div>

      {readyFiles.length === 0 && (
        <p className="muted">{t('dwgPending')}</p>
      )}

      {showCompare && fileA && fileB && (
        <div className="eng-compare-panels">
          <div className="eng-compare-panel">
            <div className="eng-compare-panel-label">{fileA.fileName}</div>
            <ComparePane fileId={fileA.id} />
          </div>
          <div className="eng-compare-panel eng-compare-panel--mid">
            <div className="eng-compare-panel-label">Diff</div>
            <div className="eng-viewer-placeholder">
              <span className="muted">Side-by-side diff</span>
            </div>
          </div>
          <div className="eng-compare-panel">
            <div className="eng-compare-panel-label">{fileB.fileName}</div>
            <ComparePane fileId={fileB.id} />
          </div>
        </div>
      )}
    </div>
  )
}

function ComparePane({ fileId }: { fileId: number }) {
  const { t } = useTranslation()
  const { data, isLoading } = useGetDxf(fileId)

  if (isLoading) {
    return (
      <div className="eng-viewer-placeholder">
        <span className="eng-drop-spinner" />
        <span>{t('loading')}</span>
      </div>
    )
  }

  if (!data?.dxfContent) {
    return <div className="eng-viewer-placeholder"><span>{t('dwgFailed')}</span></div>
  }

  return <DxfViewerPane dxfContent={data.dxfContent} />
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function EngineeringTools() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const { data: files = [], isLoading, refetch } = useDwgFiles()
  const deleteMutation = useDeleteDwgFile()
  const [tab, setTab] = useState<'files' | 'compare'>('files')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Poll while any file is converting or pending
  useEffect(() => {
    const hasPending = files.some(f => f.status === 'converting' || f.status === 'pending')
    if (!hasPending) return
    const timer = setInterval(() => { refetch() }, 2000)
    return () => clearInterval(timer)
  }, [files, refetch])

  const selectedFile = files.find(f => f.id === selectedId) ?? null

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

      {/* ── Tabs ── */}
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
          {t('compareDwg')}
        </button>
      </div>

      {/* ── Files tab ── */}
      {tab === 'files' && (
        <div className="eng-files-tab">
          <UploadArea onUploaded={() => { refetch() }} />

          <div className="eng-file-list">
            {isLoading && <p className="muted">{t('loading')}</p>}
            {!isLoading && files.length === 0 && (
              <p className="muted">{t('dwgPending')}</p>
            )}
            {files.map(file => (
              <div
                key={file.id}
                className={`eng-file-row${selectedId === file.id ? ' eng-file-row--selected' : ''}`}
                onClick={() => setSelectedId(selectedId === file.id ? null : file.id)}
              >
                <div className="eng-file-info">
                  <span className="eng-file-name">{file.fileName}</span>
                  <span className="eng-file-meta">
                    {file.version && <span>{t('dwgVersion')}: {file.version}</span>}
                    <span>{(file.fileSize / 1024).toFixed(1)} KB</span>
                  </span>
                </div>
                <div className="eng-file-actions">
                  <StatusBadge status={file.status} />
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
                      title="Delete"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Inline DXF viewer ── */}
          {selectedFile && (
            <div className="eng-viewer-wrap">
              <div className="eng-viewer-header">
                <span className="eng-viewer-filename">{selectedFile.fileName}</span>
                <StatusBadge status={selectedFile.status} />
              </div>
              <ViewerPanel file={selectedFile} />
            </div>
          )}
        </div>
      )}

      {/* ── Compare tab ── */}
      {tab === 'compare' && (
        <CompareTab files={files} />
      )}
    </div>
  )
}
