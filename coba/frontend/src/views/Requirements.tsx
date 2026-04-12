import { useState, useRef } from 'react'
import { trpcClient } from '../trpc'
import { useTranslation } from '../i18n/context'
import type { TranslationKey } from '../i18n/en'
import type { Page } from '../App'
import { CATEGORIES, CAT_KEY } from '../constants/projects'
import { useListBooks, useCreateBook, useBookById, useUpdateBook, useDeleteBook, useCreateRequirement, useUpdateRequirement, useDeleteRequirement, useMatchMembers, useAddReqAssignment, useRemoveReqAssignment, useParseRequirementsFromPdf } from '../api/requirements'
import { useProjectsList } from '../api/projects'
import { useTeamList } from '../api/team'
import { useAiEnabled } from '../api/system'

// ── Constants ─────────────────────────────────────────────────────────────────

const DISCIPLINES = ['geotechnical', 'structural', 'environmental', 'hydraulic',
  'transport', 'electrical', 'planning', 'other'] as const

const LEVELS = ['any', 'junior', 'mid', 'senior', 'lead'] as const

const DISC_KEY: Record<string, TranslationKey> = {
  geotechnical: 'discGeotechnical', structural: 'discStructural',
  environmental: 'discEnvironmental', hydraulic: 'discHydraulic',
  transport: 'discTransport', electrical: 'discElectrical',
  planning: 'discPlanning', other: 'discOther',
}
const LEVEL_KEY: Record<string, TranslationKey> = {
  any: 'levelAny', junior: 'levelJunior', mid: 'levelMid',
  senior: 'levelSenior', lead: 'levelLead',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type BookForm = { title: string; projectId: string; category: string; description: string }
type ReqForm  = { title: string; description: string; discipline: string; level: string; yearsExperience: string; certifications: string; notes: string; complianceNote: string; sourceEvidence: string }
type MatchResult = {
  memberId: number; name: string; title: string; email?: string
  bio?: string; historyCount?: number; projectCount?: number
  cvId?: number | null; cvFilename?: string | null
  recentHistory?: { projectName: string; category: string; country: string }[]
  rationale: string; score?: number; evidence?: string
  cvPageRef?: number | null
}

type ParsedReq = { title: string; description: string; discipline: string; level: string; yearsExperience: number | null; certifications: string; notes: string; sourceEvidence: string }
type ImportPhase = 'idle' | 'loading' | 'review'

const emptyBookForm = (): BookForm => ({ title: '', projectId: '', category: 'other', description: '' })
const emptyReqForm  = (): ReqForm  => ({ title: '', description: '', discipline: 'other', level: 'any', yearsExperience: '', certifications: '', notes: '', complianceNote: '', sourceEvidence: '' })

// ── List view ─────────────────────────────────────────────────────────────────

interface Props { onNavigate: (page: Page) => void }

export default function Requirements({ onNavigate }: Props) {
  const { t } = useTranslation()
  const [showNewForm, setShowNewForm] = useState(false)
  const [form, setForm] = useState<BookForm>(emptyBookForm())
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Import state
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle')
  const [importBookForm, setImportBookForm] = useState({ title: '', category: 'other', description: '' })
  const [parsedReqs, setParsedReqs] = useState<ParsedReq[]>([])
  const [selectedReqs, setSelectedReqs] = useState<boolean[]>([])
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aiEnabled = useAiEnabled()
  const { data: books, isLoading } = useListBooks()
  const { data: allProjects } = useProjectsList({})

  const createBook = useCreateBook()
  const parseFromPdf = useParseRequirementsFromPdf()

  function setF(k: keyof BookForm, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function handleCreate(ev: React.FormEvent) {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = t('errorRequired')
    if (Object.keys(e).length) { setErrors(e); return }
    createBook.mutate({
      title: form.title, projectId: form.projectId ? parseInt(form.projectId) : null,
      category: form.category as typeof CATEGORIES[number], description: form.description,
    }, {
      onSuccess: () => {
        setForm(emptyBookForm()); setShowNewForm(false); setErrors({})
      },
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isDocx = file.name.endsWith('.docx')
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1]
      setImportPhase('loading')
      setImportError('')
      parseFromPdf.mutate({ fileBase64: b64, fileType: isDocx ? 'docx' : 'pdf' }, {
        onSuccess: (data) => {
          setImportBookForm({ title: data.bookTitle, category: data.bookCategory, description: data.bookDescription })
          setParsedReqs(data.requirements.map(r => ({ ...r, yearsExperience: r.yearsExperience ?? null })))
          setSelectedReqs(data.requirements.map(() => true))
          setImportPhase('review')
        },
        onError: (err) => {
          setImportError(String((err as { message?: string })?.message ?? err))
          setImportPhase('idle')
        },
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleImportConfirm() {
    const book = await trpcClient.requirements.createBook.mutate({
      title: importBookForm.title || 'Imported Requirements',
      category: importBookForm.category as typeof CATEGORIES[number],
      description: importBookForm.description,
      projectId: null,
    })
    const toCreate = parsedReqs.filter((_, i) => selectedReqs[i])
    for (const req of toCreate) {
      await trpcClient.requirements.createRequirement.mutate({
        bookId: book.id, title: req.title, description: req.description,
        discipline: req.discipline as any, level: req.level as any,
        yearsExperience: req.yearsExperience ?? null,
        certifications: req.certifications, notes: req.notes,
        complianceNote: '', sourceEvidence: req.sourceEvidence,
      })
    }
    setImportPhase('idle')
    setParsedReqs([])
    setSelectedReqs([])
    onNavigate({ view: 'requirement-book', id: book.id, title: book.title })
  }

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>{t('reqBooksTitle')}</h1>
          <p className="view-sub">{t('reqBooksSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={importPhase === 'loading' || !aiEnabled} title={!aiEnabled ? t('aiDisabled') : undefined}>
            {importPhase === 'loading' ? t('importParsing') : t('importFromPdf')}
          </button>
          <button className="btn-submit" onClick={() => setShowNewForm(p => !p)}>
            {showNewForm ? t('btnCancelEdit') : `+ ${t('btnNewBook')}`}
          </button>
        </div>
      </div>

      {importError && <p className="field-error" style={{ marginBottom: '1rem' }}>{importError}</p>}

      {importPhase === 'review' && (
        <div className="import-review-panel">
          <h2>{t('importReviewTitle')}</h2>
          <p className="import-subtitle">{t('importReviewSubtitle')}</p>
          <div className="import-book-fields">
            <div className="field">
              <label className="field-label">{t('reqBookFieldTitle')}</label>
              <input className="input" value={importBookForm.title} onChange={e => setImportBookForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-grid form-grid--2">
              <div className="field">
                <label className="field-label">{t('reqBookFieldCategory')}</label>
                <select className="input" value={importBookForm.category} onChange={e => setImportBookForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(CAT_KEY[c])}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">{t('reqBookFieldDescription')}</label>
              <textarea className="input textarea" rows={2} value={importBookForm.description} onChange={e => setImportBookForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <div className="import-select-btns">
            <button onClick={() => setSelectedReqs(parsedReqs.map(() => true))}>{t('importSelectAll')}</button>
            <button onClick={() => setSelectedReqs(parsedReqs.map(() => false))}>{t('importDeselectAll')}</button>
          </div>

          <div className="import-req-list">
            {parsedReqs.map((req, i) => (
              <div key={i} className={`import-req-item${!selectedReqs[i] ? ' import-req-item--deselected' : ''}`}>
                <input type="checkbox" checked={selectedReqs[i]} onChange={() => setSelectedReqs(s => s.map((v, j) => j === i ? !v : v))} style={{ marginTop: 3, flexShrink: 0 }} />
                <div className="import-req-body">
                  <div className="import-req-title">{req.title}</div>
                  <div className="import-req-badges">
                    <span className="pill pill--sm req-disc-pill">{req.discipline}</span>
                    <span className="pill pill--sm req-level-pill">{req.level}</span>
                    {req.yearsExperience != null && <span className="pill pill--sm">⏱ {req.yearsExperience}+ yrs</span>}
                    {req.certifications && <span className="pill pill--sm">🎓 {req.certifications}</span>}
                  </div>
                  {req.description && <p className="import-req-detail">{req.description}</p>}
                  {req.sourceEvidence && (
                    <blockquote className="import-req-evidence">
                      <span className="import-evidence-label">{t('importSourceEvidence')}:</span> "{req.sourceEvidence}"
                    </blockquote>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="import-actions">
            <button className="btn-submit" onClick={handleImportConfirm} disabled={!selectedReqs.some(Boolean)}>
              {t('importConfirm')} ({selectedReqs.filter(Boolean).length})
            </button>
            <button className="btn-cancel" onClick={() => { setImportPhase('idle'); setParsedReqs([]) }}>
              {t('importCancel')}
            </button>
          </div>
        </div>
      )}

      {showNewForm && (
        <form className="req-new-form" onSubmit={handleCreate} noValidate>
          <div className="form-grid form-grid--2">
            <ReqField label={t('reqBookFieldTitle')} required error={errors.title}>
              <input className="input" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="ex. Livro de Encargos — Barragem do Alqueva" />
            </ReqField>
            <ReqField label={t('reqBookFieldProject')}>
              <select className="input" value={form.projectId} onChange={e => setF('projectId', e.target.value)}>
                <option value="">{t('reqBookFieldProjectNone')}</option>
                {allProjects?.map(p => <option key={p.id} value={p.id}>{p.refCode} — {p.name}</option>)}
              </select>
            </ReqField>
            <ReqField label={t('reqBookFieldCategory')}>
              <select className="input" value={form.category} onChange={e => setF('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{t(CAT_KEY[c])}</option>)}
              </select>
            </ReqField>
          </div>
          <ReqField label={t('reqBookFieldDescription')}>
            <textarea className="input textarea" rows={2} value={form.description} onChange={e => setF('description', e.target.value)} />
          </ReqField>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => setShowNewForm(false)}>{t('btnCancelEdit')}</button>
            <button type="submit" className="btn-submit" disabled={createBook.isPending}>{t('btnCreateBook')}</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="muted">{t('loading')}</p>
      ) : !books?.length ? (
        <p className="muted">{t('reqBooksEmpty')}</p>
      ) : (
        <div className="req-books-grid">
          {books.map(b => (
            <button key={b.id} className="req-book-card" onClick={() => onNavigate({ view: 'requirement-book', id: b.id, title: b.title })}>
              <div className="req-book-card-top">
                <span className="req-book-title">{b.title}</span>
                <span className={`status-pill status-pill--${b.category}`}>{t(CAT_KEY[b.category] ?? 'catOther')}</span>
              </div>
              {b.description && <p className="req-book-desc">{b.description}</p>}
              <div className="req-book-meta">
                {b.projectRefCode && <span className="req-book-proj">🔗 {b.projectRefCode} — {b.projectName}</span>}
                <span className="req-book-count">{b.requirementCount} {t('reqCountLabel')}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Detail view ───────────────────────────────────────────────────────────────

export function RequirementBookDetail({ id, onNavigate }: { id: number; onNavigate: (page: Page) => void }) {
  const { t } = useTranslation()
  const aiEnabled = useAiEnabled()

  // Edit book state
  const [isEditingBook, setIsEditingBook] = useState(false)
  const [bookForm, setBookForm] = useState<BookForm>(emptyBookForm())

  // Requirement form state
  const [showReqForm, setShowReqForm] = useState(false)
  const [editingReqId, setEditingReqId] = useState<number | null>(null)
  const [reqForm, setReqForm] = useState<ReqForm>(emptyReqForm())

  // Per-requirement assignment state
  const [assignPanelReqId, setAssignPanelReqId] = useState<number | null>(null)
  const [assignMemberId, setAssignMemberId]       = useState('')
  const [assignRationale, setAssignRationale]     = useState('')

  // Per-requirement match state
  const [activeMatchReqId, setActiveMatchReqId]   = useState<number | null>(null)
  const [matchMode, setMatchMode]                  = useState<'local' | 'ai'>('local')
  const [matchTopN, setMatchTopN]                  = useState(5)
  const [matchResultsByReqId, setMatchResultsByReqId] = useState<Record<number, MatchResult[]>>({})
  const [expandedMatchByReqId, setExpandedMatchByReqId] = useState<Record<number, number | null>>({})

  const { data: book, isLoading } = useBookById(id)
  const { data: allProjects } = useProjectsList({})

  const updateBook      = useUpdateBook()
  const deleteBook      = useDeleteBook()
  const createReq       = useCreateRequirement()
  const updateReq       = useUpdateRequirement()
  const deleteReq       = useDeleteRequirement()
  const matchMembersMut = useMatchMembers()
  const addAssignment   = useAddReqAssignment()
  const removeAssignment = useRemoveReqAssignment()
  const { data: allMembers } = useTeamList()
  function setRF(k: keyof ReqForm, v: string) { setReqForm(f => ({ ...f, [k]: v })) }

  function startEditBook() {
    if (!book) return
    setBookForm({ title: book.title, projectId: book.projectId ? String(book.projectId) : '', category: book.category, description: book.description })
    setIsEditingBook(true)
  }

  function handleSaveBook(ev: React.FormEvent) {
    ev.preventDefault()
    updateBook.mutate({
      id, title: bookForm.title, projectId: bookForm.projectId ? parseInt(bookForm.projectId) : null,
      category: bookForm.category as typeof CATEGORIES[number], description: bookForm.description,
    }, { onSuccess: () => { setIsEditingBook(false) } })
  }

  function openAddReq() { setEditingReqId(null); setReqForm(emptyReqForm()); setShowReqForm(true) }

  function openEditReq(r: NonNullable<typeof book>['requirements'][number]) {
    setEditingReqId(r.id)
    setReqForm({ title: r.title, description: r.description, discipline: r.discipline, level: r.level, yearsExperience: r.yearsExperience != null ? String(r.yearsExperience) : '', certifications: r.certifications, notes: r.notes, complianceNote: r.complianceNote ?? '', sourceEvidence: r.sourceEvidence ?? '' })
    setShowReqForm(true)
  }

  function handleSaveReq(ev: React.FormEvent) {
    ev.preventDefault()
    const payload = {
      bookId: id, title: reqForm.title, description: reqForm.description,
      discipline: reqForm.discipline as typeof DISCIPLINES[number],
      level: reqForm.level as typeof LEVELS[number],
      yearsExperience: reqForm.yearsExperience ? parseInt(reqForm.yearsExperience) : null,
      certifications: reqForm.certifications, notes: reqForm.notes,
      complianceNote: reqForm.complianceNote, sourceEvidence: reqForm.sourceEvidence,
    }
    if (editingReqId != null) {
      updateReq.mutate({ id: editingReqId, ...payload }, { onSuccess: () => { setShowReqForm(false) } })
    } else {
      createReq.mutate(payload, { onSuccess: () => { setShowReqForm(false) } })
    }
  }

  function handleAddAssignment(reqId: number) {
    if (!assignMemberId) return
    addAssignment.mutate({ requirementId: reqId, teamMemberId: parseInt(assignMemberId), rationale: assignRationale }, {
      onSuccess: () => { setAssignMemberId(''); setAssignRationale('') },
    })
  }

  function handleDeleteBook() {
    if (!confirm('Eliminar este livro de encargos e todos os seus requisitos?')) return
    deleteBook.mutate({ id }, { onSuccess: () => { onNavigate({ view: 'requirements' }) } })
  }

  function toggleMatchPanel(reqId: number) {
    if (activeMatchReqId === reqId) {
      setActiveMatchReqId(null)
    } else {
      setActiveMatchReqId(reqId)
    }
  }

  function runMatch(reqId: number) {
    matchMembersMut.mutate(
      { requirementId: reqId, mode: matchMode, topN: matchTopN },
      {
        onSuccess: data => {
          setMatchResultsByReqId(prev => ({ ...prev, [reqId]: data as MatchResult[] }))
          setExpandedMatchByReqId(prev => ({ ...prev, [reqId]: null }))
        },
      }
    )
  }

  function toggleExpandMatch(reqId: number, memberId: number) {
    setExpandedMatchByReqId(prev => ({ ...prev, [reqId]: prev[reqId] === memberId ? null : memberId }))
  }

  if (isLoading) return <div className="page-loading">{t('loading')}</div>
  if (!book) return <div className="page-loading">Book not found.</div>

  const isPendingReq = createReq.isPending || updateReq.isPending

  return (
    <div className="view">
      {/* Header */}
      {isEditingBook ? (
        <form className="req-edit-book-form" onSubmit={handleSaveBook} noValidate>
          <div className="form-grid form-grid--2">
            <ReqField label={t('reqBookFieldTitle')} required>
              <input className="input" value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} />
            </ReqField>
            <ReqField label={t('reqBookFieldProject')}>
              <select className="input" value={bookForm.projectId} onChange={e => setBookForm(f => ({ ...f, projectId: e.target.value }))}>
                <option value="">{t('reqBookFieldProjectNone')}</option>
                {allProjects?.map(p => <option key={p.id} value={p.id}>{p.refCode} — {p.name}</option>)}
              </select>
            </ReqField>
            <ReqField label={t('reqBookFieldCategory')}>
              <select className="input" value={bookForm.category} onChange={e => setBookForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{t(CAT_KEY[c])}</option>)}
              </select>
            </ReqField>
          </div>
          <ReqField label={t('reqBookFieldDescription')}>
            <textarea className="input textarea" rows={2} value={bookForm.description} onChange={e => setBookForm(f => ({ ...f, description: e.target.value }))} />
          </ReqField>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => setIsEditingBook(false)}>{t('btnCancelEdit')}</button>
            <button type="submit" className="btn-submit" disabled={updateBook.isPending}>{t('btnSaveBook')}</button>
          </div>
        </form>
      ) : (
        <div className="req-detail-header">
          <div className="req-detail-hero">
            <div>
              <h1 className="req-detail-title">{book.title}</h1>
              <div className="req-detail-meta">
                <span className={`status-pill status-pill--${book.category}`}>{t(CAT_KEY[book.category] ?? 'catOther')}</span>
                {book.project && (
                  <button className="req-detail-proj-link" onClick={() => onNavigate({ view: 'project', id: book.project!.id, name: book.project!.name })}>
                    🔗 {book.project.refCode} — {book.project.name}
                  </button>
                )}
              </div>
              {book.description && <p className="req-detail-desc">{book.description}</p>}
            </div>
            <div className="req-detail-actions">
              <button className="btn-secondary btn-sm" onClick={startEditBook}>{t('btnEditMember')}</button>
              <button className="btn-danger btn-sm" onClick={handleDeleteBook}>{t('btnDeleteBook')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Requirements list */}
      <section className="detail-section">
        <div className="section-heading-row">
          <h2 className="detail-section-title">{t('reqSectionTitle')}</h2>
          <button className="btn-add-geo" onClick={openAddReq}>+ {t('btnAddRequirement')}</button>
        </div>

        {showReqForm && editingReqId === null && <ReqFormCard reqForm={reqForm} setRF={setRF} onSave={handleSaveReq} onCancel={() => setShowReqForm(false)} isPending={isPendingReq} t={t} />}

        {!book.requirements.length && !showReqForm ? (
          <p className="muted">{t('reqEmpty')}</p>
        ) : (
          <div className="req-items-list">
            {book.requirements.map(r => {
              const isMatchOpen   = activeMatchReqId === r.id
              const reqMatches    = matchResultsByReqId[r.id] ?? []
              const expandedMatch = expandedMatchByReqId[r.id] ?? null
              const isRunningThis = matchMembersMut.isPending && activeMatchReqId === r.id

              return showReqForm && editingReqId === r.id ? (
                <ReqFormCard key={r.id} reqForm={reqForm} setRF={setRF} onSave={handleSaveReq} onCancel={() => setShowReqForm(false)} isPending={isPendingReq} t={t} />
              ) : (
                <div key={r.id} className="req-item-card">
                  <div className="req-item-header">
                    <div className="req-item-title-row">
                      <span className="req-item-title">{r.title}</span>
                      <span className="pill pill--sm req-disc-pill">{t(DISC_KEY[r.discipline] ?? 'discOther')}</span>
                      <span className="pill pill--sm req-level-pill">{t(LEVEL_KEY[r.level] ?? 'levelAny')}</span>
                    </div>
                    <div className="req-item-actions">
                      <button className="btn-secondary btn-sm req-match-btn" onClick={() => toggleMatchPanel(r.id)}>
                        {isMatchOpen ? '▲' : `✦ ${t('btnFindMatchesReq')}`}
                      </button>
                      <button className="history-card-edit" onClick={() => openEditReq(r)}>✎</button>
                      <button className="history-card-del" onClick={() => deleteReq.mutate({ id: r.id })}>✕</button>
                    </div>
                  </div>
                  {r.description && <p className="req-item-desc">{r.description}</p>}
                  <div className="req-item-meta">
                    {r.yearsExperience != null && <span className="req-meta-chip">⏱ {r.yearsExperience}+ anos</span>}
                    {r.certifications && <span className="req-meta-chip">🎓 {r.certifications}</span>}
                    {r.notes && <span className="req-meta-chip req-meta-chip--note">📝 {r.notes}</span>}
                  </div>
                  {r.sourceEvidence && (
                    <blockquote className="req-source-evidence">
                      <span className="req-evidence-label">{t('importSourceEvidence')}:</span> "{r.sourceEvidence}"
                    </blockquote>
                  )}
                  {r.complianceNote && (
                    <div className="req-compliance-note">
                      <span className="req-compliance-label">✓ {t('reqFieldComplianceNote')}:</span> {r.complianceNote}
                    </div>
                  )}

                  {/* Assignments */}
                  <div className="req-assignments">
                    <div className="req-assign-header">
                      <span className="req-assign-title">{t('reqAssignmentsTitle')}</span>
                      <button className="btn-secondary btn-sm" onClick={() => setAssignPanelReqId(assignPanelReqId === r.id ? null : r.id)}>
                        {assignPanelReqId === r.id ? '▲' : `+ ${t('btnAssignMember')}`}
                      </button>
                    </div>
                    {r.assignments && r.assignments.length > 0 ? (
                      <div className="req-assign-list">
                        {r.assignments.map(a => (
                          <div key={a.teamMemberId} className="req-assign-chip">
                            <button className="req-assign-name" onClick={() => onNavigate({ view: 'member', id: a.teamMemberId, name: a.memberName })}>{a.memberName}</button>
                            {a.memberTitle && <span className="req-assign-title-text">{a.memberTitle}</span>}
                            {a.rationale && <span className="req-assign-rationale">— {a.rationale}</span>}
                            <button className="req-assign-remove" onClick={() => removeAssignment.mutate({ requirementId: r.id, teamMemberId: a.teamMemberId })} title="Remove">✕</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="req-assign-empty">{t('reqAssignmentsEmpty')}</p>
                    )}
                    {assignPanelReqId === r.id && (
                      <div className="req-assign-form">
                        <select className="input input--sm" value={assignMemberId} onChange={e => setAssignMemberId(e.target.value)}>
                          <option value="">— {t('btnAssignMember')} —</option>
                          {allMembers?.filter(m => !r.assignments?.some(a => a.teamMemberId === m.id)).map(m => (
                            <option key={m.id} value={m.id}>{m.name}{m.title ? ` — ${m.title}` : ''}</option>
                          ))}
                        </select>
                        <input className="input input--sm" placeholder={t('reqAssignRationalePlaceholder')} value={assignRationale} onChange={e => setAssignRationale(e.target.value)} />
                        <button className="btn-submit btn-sm" disabled={!assignMemberId || addAssignment.isPending} onClick={() => handleAddAssignment(r.id)}>+</button>
                      </div>
                    )}
                  </div>

                  {/* Per-requirement match panel */}
                  {isMatchOpen && (
                    <div className="suggest-panel req-match-panel">
                      <div className="suggest-controls">
                        <div className="suggest-mode-tabs">
                          <button type="button" className={`suggest-mode-btn${matchMode === 'local' ? ' suggest-mode-btn--active' : ''}`} onClick={() => setMatchMode('local')}>{t('reqMatchModeLocal')}</button>
                          <button type="button" className={`suggest-mode-btn${matchMode === 'ai' ? ' suggest-mode-btn--active' : ''}`} onClick={() => setMatchMode('ai')} disabled={!aiEnabled} title={!aiEnabled ? t('aiDisabled') : undefined}>{t('reqMatchModeAi')}</button>
                        </div>
                        <label className="suggest-topn-label">
                          {t('reqMatchTopN')}
                          <input className="input suggest-topn-input" type="number" min={1} max={20} value={matchTopN} onChange={e => setMatchTopN(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))} />
                        </label>
                        <button className="btn-submit btn-sm" disabled={matchMembersMut.isPending}
                          onClick={() => runMatch(r.id)}>
                          {isRunningThis ? t('reqMatchLoading') : t('btnFindMatchesReq')}
                        </button>
                      </div>

                      {matchMembersMut.isError && isMatchOpen && (
                        <p className="field-error" style={{ marginTop: 8 }}>{String((matchMembersMut.error as unknown as { message?: string })?.message ?? matchMembersMut.error)}</p>
                      )}

                      {reqMatches.length > 0 && (
                        <div className="suggest-results" style={{ marginTop: 14 }}>
                          {reqMatches.map((m, i) => {
                            const isExp = expandedMatch === m.memberId
                            return (
                              <div key={m.memberId} className={`suggest-card${isExp ? ' suggest-card--expanded' : ''}`}>
                                <div className="suggest-card-rank">#{i + 1}</div>
                                <div className="suggest-card-avatar">{initials(m.name)}</div>
                                <div className="suggest-card-body">
                                  <div className="suggest-card-header">
                                    <button className="suggest-card-name-btn" onClick={() => onNavigate({ view: 'member', id: m.memberId, name: m.name })}>{m.name}</button>
                                    {m.title && <span className="suggest-card-title">{m.title}</span>}
                                    {m.score != null && <span className="suggest-score">{t('suggestScoreLabel')}: {m.score}</span>}
                                    <span className="suggest-card-badges">
                                      {(m.projectCount ?? 0) > 0 && <span className="suggest-badge" title={t('memberDetailProjects')}>{m.projectCount} proj.</span>}
                                      {(m.historyCount ?? 0) > 0 && <span className="suggest-badge">{m.historyCount} hist.</span>}
                                    </span>
                                  </div>
                                  <p className="suggest-card-rationale">{m.rationale}</p>
                                  {m.evidence && (
                                    <div className="suggest-evidence-block">
                                      <span className="suggest-evidence-label">{t('suggestEvidenceLabel')}:</span>
                                      <blockquote className="suggest-evidence">"{m.evidence}"</blockquote>
                                      {m.cvId && (
                                        <a
                                          className="suggest-cv-link"
                                          href={`/api/cv/${m.cvId}#page=${m.cvPageRef ?? 1}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title={t('suggestOpenCv')}
                                        >
                                          📄 {t('suggestOpenCvPage').replace('{page}', String(m.cvPageRef ?? 1))}
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {!m.evidence && m.cvId && (
                                    <div className="suggest-card-links">
                                      <a
                                        className="suggest-cv-link"
                                        href={`/api/cv/${m.cvId}#page=1`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        📄 {t('suggestOpenCv')}
                                      </a>
                                    </div>
                                  )}
                                  {isExp && (
                                    <div className="suggest-card-detail">
                                      {m.email && <p className="suggest-detail-contact">✉ {m.email}</p>}
                                      {m.bio && <p className="suggest-detail-bio">{m.bio}</p>}
                                      {m.recentHistory && m.recentHistory.length > 0 && (
                                        <div className="suggest-detail-history">
                                          {m.recentHistory.map((h, hi) => (
                                            <span key={hi} className="suggest-history-chip">
                                              <span className="pill pill--sm pill--cat">{h.category}</span>
                                              {h.projectName}{h.country ? ` · ${h.country}` : ''}
                                            </span>
                                          ))}
                                          {(m.historyCount ?? 0) > 3 && <span className="suggest-history-more">+{(m.historyCount ?? 0) - 3} mais</span>}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="suggest-card-actions">
                                  <button className="suggest-expand-btn" onClick={() => toggleExpandMatch(r.id, m.memberId)}>{isExp ? '▲' : '▼'}</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {!isRunningThis && matchMembersMut.isSuccess && reqMatches.length === 0 && (
                        <p className="muted" style={{ marginTop: 10 }}>{t('reqMatchNoResults')}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="detail-back">
        <button className="btn-back" onClick={() => onNavigate({ view: 'requirements' })}>&larr; {t('reqDetailBack')}</button>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}


// ── Shared components ─────────────────────────────────────────────────────────

function ReqFormCard({ reqForm, setRF, onSave, onCancel, isPending, t }: {
  reqForm: ReqForm
  setRF: (k: keyof ReqForm, v: string) => void
  onSave: (ev: React.FormEvent) => void
  onCancel: () => void
  isPending: boolean
  t: (k: TranslationKey) => string
}) {
  return (
    <form className="req-form-card" onSubmit={onSave} noValidate>
      <div className="form-grid form-grid--2">
        <ReqField label={t('reqFieldTitle')} required>
          <input className="input" value={reqForm.title} onChange={e => setRF('title', e.target.value)} placeholder="ex. Engenheiro Geotécnico Sénior" />
        </ReqField>
        <div className="form-grid form-grid--2" style={{ gridColumn: 'span 1' }}>
          <ReqField label={t('reqFieldDiscipline')}>
            <select className="input" value={reqForm.discipline} onChange={e => setRF('discipline', e.target.value)}>
              {DISCIPLINES.map(d => <option key={d} value={d}>{t(DISC_KEY[d])}</option>)}
            </select>
          </ReqField>
          <ReqField label={t('reqFieldLevel')}>
            <select className="input" value={reqForm.level} onChange={e => setRF('level', e.target.value)}>
              {LEVELS.map(l => <option key={l} value={l}>{t(LEVEL_KEY[l])}</option>)}
            </select>
          </ReqField>
        </div>
        <ReqField label={t('reqFieldYears')}>
          <input className="input" type="number" min={0} value={reqForm.yearsExperience} onChange={e => setRF('yearsExperience', e.target.value)} />
        </ReqField>
        <ReqField label={t('reqFieldCerts')}>
          <input className="input" value={reqForm.certifications} onChange={e => setRF('certifications', e.target.value)} placeholder="ex. Ordem dos Engenheiros" />
        </ReqField>
      </div>
      <ReqField label={t('reqFieldDescription')}>
        <textarea className="input textarea" rows={2} value={reqForm.description} onChange={e => setRF('description', e.target.value)} />
      </ReqField>
      <ReqField label={t('reqFieldNotes')}>
        <input className="input" value={reqForm.notes} onChange={e => setRF('notes', e.target.value)} />
      </ReqField>
      <ReqField label={t('reqFieldComplianceNote')}>
        <textarea className="input textarea" rows={2} value={reqForm.complianceNote} onChange={e => setRF('complianceNote', e.target.value)} placeholder={t('reqFieldComplianceNotePlaceholder')} />
      </ReqField>
      <ReqField label={t('reqFieldSourceEvidence')}>
        <textarea className="input textarea" rows={2} value={reqForm.sourceEvidence} onChange={e => setRF('sourceEvidence', e.target.value)} placeholder={t('reqFieldSourceEvidencePlaceholder')} />
      </ReqField>
      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>{t('btnCancelRequirement')}</button>
        <button type="submit" className="btn-submit" disabled={isPending}>{t('btnSaveRequirement')}</button>
      </div>
    </form>
  )
}

function ReqField({ label, children, required, error }: { label: string; children: React.ReactNode; required?: boolean; error?: string }) {
  return (
    <div className="field">
      <label className="field-label">{label}{required && <span className="field-required"> *</span>}</label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
