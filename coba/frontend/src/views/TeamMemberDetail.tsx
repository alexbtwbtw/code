import { useState, useRef } from 'react'
import { trpcClient } from '../trpc'
import { useTranslation } from '../i18n/context'
import type { Page } from '../App'
import { GeoSection, StructureSection, Field } from '../components/shared'
import { STRUCT_TYPE_KEY, type GeoFormEntry, type StructureFormEntry } from '../components/shared'
import { CATEGORIES, CAT_KEY, STATUS_KEY } from '../constants/projects'
import { GEO_TYPE_KEY } from '../constants/geo'
import { TASK_STATUS_KEY, TASK_PRIORITY_KEY } from '../constants/tasks'
import { initials, fmtDate } from '../utils/format'
import { useMemberById, useUpdateMember, useAddHistory, useUpdateHistory, useDeleteHistory, useAttachCv } from '../api/team'
import { useProjectsList } from '../api/projects'
import { useTasksByMember } from '../api/tasks'
import { useTimeByMember } from '../api/timeEntries'
import { useCompanyTeamsByMember } from '../api/companyTeams'

interface Props {
  id: number
  onNavigate: (page: Page) => void
}

type HistoryFormData = {
  projectId: string
  projectName: string
  macroRegion: string; country: string; place: string
  category: string; startDate: string; endDate: string; notes: string
  geoEntries: GeoFormEntry[]
  structures: StructureFormEntry[]
}

const emptyHistoryForm = (): HistoryFormData => ({
  projectId: '', projectName: '', macroRegion: '', country: '', place: '',
  category: 'other', startDate: '', endDate: '', notes: '', geoEntries: [], structures: [],
})

export default function TeamMemberDetail({ id, onNavigate }: Props) {
  const { t } = useTranslation()
  // Edit member state
  const [isEditing, setIsEditing] = useState(false)
  const [memberForm, setMemberForm] = useState({ name: '', title: '', email: '', phone: '', bio: '' })
  const [memberErrors, setMemberErrors] = useState<Record<string, string>>({})
  const [editSuccess, setEditSuccess] = useState(false)

  // History form state
  const [showHistoryForm, setShowHistoryForm] = useState(false)
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null)
  const [historyForm, setHistoryForm] = useState<HistoryFormData>(emptyHistoryForm())

  // CV upload state
  const cvUploadRef = useRef<HTMLInputElement>(null)
  const [cvUploadError, setCvUploadError] = useState('')
  const [cvUploadSuccess, setCvUploadSuccess] = useState(false)

  const { data: member, isLoading } = useMemberById(id)
  const { data: allProjects } = useProjectsList({})
  const { data: memberTasks } = useTasksByMember(id)
  const { data: memberTime } = useTimeByMember(id)
  const { data: memberTeams } = useCompanyTeamsByMember(id)

  const updateMember  = useUpdateMember()
  const addHistory    = useAddHistory()
  const updateHistory = useUpdateHistory()
  const deleteHistory = useDeleteHistory()
  const attachCv      = useAttachCv()

  async function downloadCv(cvId: number, filename: string) {
    const data = await trpcClient.team.getCvData.query({ cvId })
    if (!data) return
    if ('presignedUrl' in data) {
      const a = document.createElement('a')
      a.href = data.presignedUrl; a.download = filename; a.click()
      return
    }
    if (!data.fileData) return
    const bytes = Uint8Array.from(atob(data.fileData), c => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Member edit ─────────────────────────────────────────────────────────────
  function startEditing() {
    if (!member) return
    setMemberForm({ name: member.name, title: member.title, email: member.email, phone: member.phone, bio: member.bio })
    setMemberErrors({})
    setIsEditing(true)
  }

  function handleMemberSave(ev: React.FormEvent) {
    ev.preventDefault()
    const errs: Record<string, string> = {}
    if (!memberForm.name.trim()) errs.name = t('errorRequired')
    if (Object.keys(errs).length) { setMemberErrors(errs); return }
    updateMember.mutate({ id, ...memberForm }, {
      onSuccess: () => { setIsEditing(false); setEditSuccess(true); setTimeout(() => setEditSuccess(false), 4000) },
    })
  }

  // ── History form ─────────────────────────────────────────────────────────────
  function openAddHistory() {
    setEditingHistoryId(null)
    setHistoryForm(emptyHistoryForm())
    setShowHistoryForm(true)
  }

  function openEditHistory(h: NonNullable<typeof member>['history'][number]) {
    setEditingHistoryId(h.id)
    setHistoryForm({
      projectId:   h.projectId != null ? String(h.projectId) : '',
      projectName: h.projectName,
      macroRegion: h.macroRegion,
      country:     h.country,
      place:       h.place,
      category:    h.category,
      startDate:   h.startDate?.slice(0, 10) || '',
      endDate:     h.endDate?.slice(0, 10) || '',
      notes:       h.notes,
      geoEntries: h.geoEntries.map(g => ({
        pointLabel: g.pointLabel, type: g.type as GeoFormEntry['type'],
        depth: g.depth != null ? String(g.depth) : '', soilType: g.soilType || '',
        rockType: g.rockType || '', groundwaterDepth: g.groundwaterDepth != null ? String(g.groundwaterDepth) : '',
        bearingCapacity: g.bearingCapacity != null ? String(g.bearingCapacity) : '',
        sptNValue: g.sptNValue != null ? String(g.sptNValue) : '', seismicClass: g.seismicClass || '',
        latitude: g.latitude != null ? String(g.latitude) : '', longitude: g.longitude != null ? String(g.longitude) : '',
        sampledAt: g.sampledAt?.slice(0, 10) || '', notes: g.notes || '',
      })),
      structures: h.structures.map(s => ({
        label: s.label, type: s.type as StructureFormEntry['type'], material: s.material || '',
        lengthM: s.lengthM != null ? String(s.lengthM) : '', heightM: s.heightM != null ? String(s.heightM) : '',
        spanM: s.spanM != null ? String(s.spanM) : '', foundationType: s.foundationType || '',
        designLoad: s.designLoad != null ? String(s.designLoad) : '',
        latitude: s.latitude != null ? String(s.latitude) : '', longitude: s.longitude != null ? String(s.longitude) : '',
        builtAt: s.builtAt?.slice(0, 10) || '', notes: s.notes || '',
      })),
    })
    setShowHistoryForm(true)
  }

  function setHField<K extends keyof HistoryFormData>(k: K, v: HistoryFormData[K]) {
    setHistoryForm(f => ({ ...f, [k]: v }))
  }

  function handleLinkedProjectChange(projectIdStr: string) {
    setHField('projectId', projectIdStr)
    if (projectIdStr && allProjects) {
      const proj = allProjects.find(p => p.id === parseInt(projectIdStr))
      if (proj) setHistoryForm(f => ({ ...f, projectId: projectIdStr, projectName: proj.name, macroRegion: proj.macroRegion || '', country: proj.country || '', place: proj.place || '', category: proj.category }))
    }
  }

  function buildPayload() {
    return {
      teamMemberId: id,
      projectId: historyForm.projectId ? parseInt(historyForm.projectId) : null,
      projectName: historyForm.projectName,
      macroRegion: historyForm.macroRegion, country: historyForm.country, place: historyForm.place,
      category: historyForm.category,
      startDate: historyForm.startDate || undefined,
      endDate: historyForm.endDate || undefined,
      notes: historyForm.notes,
      geoEntries: historyForm.geoEntries.map(g => ({
        pointLabel: g.pointLabel, type: g.type,
        depth: g.depth ? parseFloat(g.depth) : undefined,
        soilType: g.soilType, rockType: g.rockType,
        groundwaterDepth: g.groundwaterDepth ? parseFloat(g.groundwaterDepth) : undefined,
        bearingCapacity: g.bearingCapacity ? parseFloat(g.bearingCapacity) : undefined,
        sptNValue: g.sptNValue ? parseInt(g.sptNValue) : undefined,
        seismicClass: g.seismicClass,
        latitude: g.latitude ? parseFloat(g.latitude) : undefined,
        longitude: g.longitude ? parseFloat(g.longitude) : undefined,
        sampledAt: g.sampledAt || undefined, notes: g.notes,
      })),
      structures: historyForm.structures.map(s => ({
        label: s.label, type: s.type, material: s.material,
        lengthM: s.lengthM ? parseFloat(s.lengthM) : undefined,
        heightM: s.heightM ? parseFloat(s.heightM) : undefined,
        spanM: s.spanM ? parseFloat(s.spanM) : undefined,
        foundationType: s.foundationType,
        designLoad: s.designLoad ? parseFloat(s.designLoad) : undefined,
        latitude: s.latitude ? parseFloat(s.latitude) : undefined,
        longitude: s.longitude ? parseFloat(s.longitude) : undefined,
        builtAt: s.builtAt || undefined, notes: s.notes,
      })),
    }
  }

  function handleHistorySave(ev: React.FormEvent) {
    ev.preventDefault()
    const payload = buildPayload()
    if (editingHistoryId != null) {
      updateHistory.mutate({ id: editingHistoryId, ...payload }, { onSuccess: () => { setShowHistoryForm(false) } })
    } else {
      addHistory.mutate(payload, { onSuccess: () => { setShowHistoryForm(false) } })
    }
  }

  // ── CV upload ─────────────────────────────────────────────────────────────
  async function handleCvUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setCvUploadError(t('cvErrorNotPdf')); return }
    if (file.size > 10 * 1024 * 1024) { setCvUploadError(t('cvErrorTooLarge')); return }
    setCvUploadError('')
    const fileData = await fileToBase64(file)
    attachCv.mutate(
      { teamMemberId: id, filename: file.name, fileSize: file.size, fileData },
      {
        onSuccess: () => {
          setCvUploadSuccess(true)
          setTimeout(() => setCvUploadSuccess(false), 4000)
        },
        onError: () => setCvUploadError(t('memberCvUploadError')),
      },
    )
    if (cvUploadRef.current) cvUploadRef.current.value = ''
  }

  if (isLoading) return <div className="page-loading">{t('loading')}</div>
  if (!member) return <div className="page-loading">Member not found.</div>

  // ── Edit member mode ────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="view">
        <div className="view-header"><h1>{t('editTitle')}: {member.name}</h1></div>
        <form className="inline-form" onSubmit={handleMemberSave} noValidate>
          <div className="form-grid form-grid--2">
            <Field label={t('memberFieldName')} required error={memberErrors.name}>
              <input className="input" value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label={t('memberFieldTitle')}>
              <input className="input" value={memberForm.title} onChange={e => setMemberForm(f => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label={t('memberFieldEmail')}>
              <input className="input" type="email" value={memberForm.email} onChange={e => setMemberForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label={t('memberFieldPhone')}>
              <input className="input" value={memberForm.phone} onChange={e => setMemberForm(f => ({ ...f, phone: e.target.value }))} />
            </Field>
          </div>
          <Field label={t('memberFieldBio')}>
            <textarea className="input textarea" rows={4} value={memberForm.bio} onChange={e => setMemberForm(f => ({ ...f, bio: e.target.value }))} />
          </Field>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>{t('btnCancelEdit')}</button>
            <button type="submit" className="btn-submit" disabled={updateMember.isPending}>
              {updateMember.isPending ? t('btnSavingMember') : t('btnSaveMember')}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ── View mode ───────────────────────────────────────────────────────────────
  return (
    <div className="project-page">
      {editSuccess && <div className="alert alert--success">{t('successMemberEditMessage')}</div>}
      {cvUploadSuccess && <div className="alert alert--success">{t('memberCvUploadSuccess')}</div>}
      {cvUploadError && <div className="alert alert--error">{cvUploadError}</div>}

      {/* Hero */}
      <div className="member-hero">
        <div className="member-hero-avatar">{initials(member.name)}</div>
        <div className="member-hero-info">
          <div className="member-hero-top">
            <h1 className="member-hero-name">{member.name}</h1>
            <button className="btn-edit" onClick={startEditing}>{t('btnEditMember')}</button>
          </div>
          {member.title && <p className="member-hero-title">{member.title}</p>}
          <div className="member-hero-contacts">
            {member.email && <span>✉ {member.email}</span>}
            {member.phone && <span>✆ {member.phone}</span>}
          </div>
          {member.bio && <p className="member-hero-bio">{member.bio}</p>}
          {memberTeams && memberTeams.length > 0 && (
            <div className="member-hero-teams">
              <span className="member-hero-teams-label">{t('memberTeams')}:</span>
              {memberTeams.map(team => (
                <span key={team.id} className="pill pill--sm">{team.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CV section */}
      <section className="detail-section">
        <div className="section-heading-row">
          <h2 className="detail-section-title">{t('memberCvSection')}</h2>
          <div className="cv-upload-row">
            <input
              ref={cvUploadRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handleCvUpload}
            />
            <button className="btn-add-geo" disabled={attachCv.isPending} onClick={() => cvUploadRef.current?.click()}>
              {attachCv.isPending ? t('memberCvUploading') : `📎 ${t('memberCvUpload')}`}
            </button>
          </div>
        </div>
        {!member.cvs.length ? (
          <p className="muted">{t('memberCvNone')}</p>
        ) : (
          <div className="cv-list">
            {member.cvs.map(cv => (
              <div key={cv.id} className="cv-row">
                <span className="cv-row-icon">📄</span>
                <span className="cv-row-name">{cv.filename}</span>
                <span className="cv-row-meta">{t('memberCvUploaded')} {cv.uploadedAt.slice(0, 10)}</span>
                <button className="btn-secondary btn-sm" onClick={() => downloadCv(cv.id, cv.filename)}>
                  ⬇ {t('memberCvDownload')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Assigned tasks */}
      <section className="detail-section">
        <h2 className="detail-section-title">{t('tasksTitle')}</h2>
        {!memberTasks?.length ? (
          <p className="muted">{t('tasksEmpty')}</p>
        ) : (
          <div className="task-list">
            {memberTasks.map(task => {
              const isOverdue = task.dueDate && task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10)
              return (
                <div key={task.id} className={`task-card task-card--${task.status}`}
                  onClick={() => onNavigate({ view: 'task', id: task.id, projectId: task.projectId, projectName: task.projectName })}>
                  <div className="task-card-header">
                    <span className={`task-priority-dot task-priority-dot--${task.priority}`} title={t(TASK_PRIORITY_KEY[task.priority])} />
                    <span className="task-card-title">{task.title}</span>
                    <span className={`status-pill status-pill--task-${task.status}`}>{t(TASK_STATUS_KEY[task.status] ?? 'taskStatusTodo')}</span>
                  </div>
                  <div className="task-card-footer">
                    <span className="task-card-project">{task.projectName}</span>
                    <div className="task-card-meta">
                      {task.commentCount > 0 && <span className="task-comment-count">💬 {task.commentCount}</span>}
                      {task.dueDate && (
                        <span className={`task-due${isOverdue ? ' task-due--overdue' : ''}`}>
                          {isOverdue && '⚠ '}{task.dueDate.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Tagged projects */}
      <section className="detail-section">
        <h2 className="detail-section-title">{t('memberDetailProjects')}</h2>
        {!member.taggedProjects.length ? (
          <p className="muted">{t('memberNoProjects')}</p>
        ) : (
          <div className="tagged-projects-list">
            {member.taggedProjects.map(p => (
              <button key={p.id} className="tagged-project-row" onClick={() => onNavigate({ view: 'project', id: p.id, name: p.name })}>
                <span className="tagged-project-ref">{p.refCode}</span>
                <span className="tagged-project-name">{p.name}</span>
                <span className="tagged-project-role">{p.roleOnProject}</span>
                <span className={`status-pill status-pill--${p.status}`}>{t(STATUS_KEY[p.status] ?? 'statusActive')}</span>
                <span className="tagged-project-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Project history */}
      <section className="detail-section">
        <div className="section-heading-row">
          <h2 className="detail-section-title">{t('memberDetailHistory')}</h2>
          <button className="btn-add-geo" onClick={openAddHistory}>+ {t('btnAddHistory')}</button>
        </div>

        {/* "Add new" form — shown above the list only when not editing an existing entry */}
        {showHistoryForm && editingHistoryId === null && (
          <HistoryForm
            historyForm={historyForm}
            setHField={setHField}
            setHistoryForm={setHistoryForm}
            allProjects={allProjects}
            handleLinkedProjectChange={handleLinkedProjectChange}
            handleHistorySave={handleHistorySave}
            onCancel={() => setShowHistoryForm(false)}
            isPending={addHistory.isPending || updateHistory.isPending}
            t={t}
          />
        )}

        {!member.history.length && !showHistoryForm ? (
          <p className="muted">{t('memberNoHistory')}</p>
        ) : (
          <div className="history-grid">
            {member.history.map(h => (
              /* When editing THIS card, replace it with the inline form */
              showHistoryForm && editingHistoryId === h.id ? (
                <HistoryForm
                  key={h.id}
                  historyForm={historyForm}
                  setHField={setHField}
                  setHistoryForm={setHistoryForm}
                  allProjects={allProjects}
                  handleLinkedProjectChange={handleLinkedProjectChange}
                  handleHistorySave={handleHistorySave}
                  onCancel={() => setShowHistoryForm(false)}
                  isPending={addHistory.isPending || updateHistory.isPending}
                  t={t}
                />
              ) : (
              <div key={h.id} className="history-card">
                {/* Header */}
                <div className="history-card-header">
                  <div>
                    <p className="history-card-name">{h.projectName || '—'}</p>
                    <p className="history-card-location">{[h.macroRegion, h.country, h.place].filter(Boolean).join(' · ')}</p>
                    {(h.startDate || h.endDate) && (
                      <p className="history-card-dates">{fmtDate(h.startDate)} — {fmtDate(h.endDate)}</p>
                    )}
                  </div>
                  <div className="history-card-actions">
                    <span className="history-card-cat">{t(CAT_KEY[h.category] ?? 'catOther')}</span>
                    {h.projectId && (
                      <button className="history-card-link" title="Open linked project"
                        onClick={() => onNavigate({ view: 'project', id: h.projectId!, name: h.projectName })}>↗</button>
                    )}
                    <button className="history-card-edit" onClick={() => openEditHistory(h)}>✎</button>
                    <button className="history-card-del" onClick={() => deleteHistory.mutate({ id: h.id })}>✕</button>
                  </div>
                </div>
                {h.notes && <p className="history-card-notes">{h.notes}</p>}

                {/* Geo entries */}
                {h.geoEntries.length > 0 && (
                  <div className="history-sub-section">
                    <p className="history-sub-title">{t('historyGeoTitle')}</p>
                    <div className="history-sub-grid">
                      {h.geoEntries.map((g, gi) => (
                        <div key={gi} className="history-sub-card">
                          <div className="history-sub-card-header">
                            <span className="history-sub-label">{g.pointLabel}</span>
                            <span className="pill pill--sm">{t(GEO_TYPE_KEY[g.type] ?? 'geoTypeBorehole')}</span>
                          </div>
                          {g.soilType && <p className="history-sub-detail">🪨 {g.soilType}</p>}
                          {g.rockType && <p className="history-sub-detail">⛰ {g.rockType}</p>}
                          {g.depth != null && <p className="history-sub-detail">⬇ {g.depth} m</p>}
                          {g.notes && <p className="history-sub-notes">{g.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structures */}
                {h.structures.length > 0 && (
                  <div className="history-sub-section">
                    <p className="history-sub-title">{t('historyStructuresTitle')}</p>
                    <div className="history-sub-grid">
                      {h.structures.map((s, si) => (
                        <div key={si} className="history-sub-card history-sub-card--structure">
                          <div className="history-sub-card-header">
                            <span className="history-sub-label">{s.label}</span>
                            <span className="pill pill--sm pill--structure">{t(STRUCT_TYPE_KEY[s.type] ?? 'structTypeOther')}</span>
                          </div>
                          {s.material && <p className="history-sub-detail">🧱 {s.material}</p>}
                          {s.lengthM != null && <p className="history-sub-detail">↔ {s.lengthM} m</p>}
                          {s.heightM != null && <p className="history-sub-detail">↕ {s.heightM} m</p>}
                          {s.builtAt && <p className="history-sub-detail">📅 {fmtDate(s.builtAt)}</p>}
                          {s.notes && <p className="history-sub-notes">{s.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {h.features.length > 0 && (
                  <div className="history-sub-section">
                    <p className="history-sub-title">{t('historyFeaturesTitle')}</p>
                    <div className="history-sub-grid">
                      {h.features.map((f, fi) => (
                        <div key={fi} className="history-sub-card">
                          <div className="history-sub-card-header">
                            <span className="history-sub-label">{f.label}</span>
                          </div>
                          {f.description && <p className="history-sub-notes">{f.description}</p>}
                          {(f.latitude != null || f.longitude != null) && (
                            <p className="history-sub-detail">📍 {f.latitude}, {f.longitude}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )
            ))}
          </div>
        )}
      </section>

      {/* Time Logged */}
      <section className="detail-section">
        {(() => {
          const totalHours = memberTime?.reduce((sum, e) => sum + e.hours, 0) ?? 0
          return (
            <>
              <h2 className="detail-section-title">
                {t('timeTitle')}
                {totalHours > 0 && (
                  <span className="time-total-badge"> — {t('timeTotal')}: {totalHours.toFixed(1)} h</span>
                )}
              </h2>
              {!memberTime?.length ? (
                <p className="muted">{t('timeEmpty')}</p>
              ) : (
                <table className="time-table">
                  <thead>
                    <tr>
                      <th>{t('timeDate')}</th>
                      <th>{t('timeProject')}</th>
                      <th>{t('timeHours')}</th>
                      <th>{t('timeDesc')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberTime.map(entry => (
                      <tr key={entry.id}>
                        <td>{entry.date.slice(0, 10)}</td>
                        <td>{entry.projectName}</td>
                        <td>{entry.hours.toFixed(1)}</td>
                        <td>{entry.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )
        })()}
      </section>

      <div className="detail-back">
        <button className="btn-back" onClick={() => onNavigate({ view: 'team' })}>&larr; {t('navTeam')}</button>
      </div>
    </div>
  )
}

// ── Extracted history form component ─────────────────────────────────────────
import type { TranslationKey as TK } from '../i18n/en'

function HistoryForm({ historyForm, setHField, setHistoryForm, allProjects, handleLinkedProjectChange,
  handleHistorySave, onCancel, isPending, t }: {
  historyForm: HistoryFormData
  setHField: <K extends keyof HistoryFormData>(k: K, v: HistoryFormData[K]) => void
  setHistoryForm: React.Dispatch<React.SetStateAction<HistoryFormData>>
  allProjects: { id: number; refCode: string; name: string }[] | undefined
  handleLinkedProjectChange: (v: string) => void
  handleHistorySave: (ev: React.FormEvent) => void
  onCancel: () => void
  isPending: boolean
  t: (k: TK) => string
}) {
  return (
    <form className="history-form" onSubmit={handleHistorySave} noValidate>
      <div className="form-grid form-grid--2">
        <Field label={t('historyFieldLinked')}>
          <select className="input" value={historyForm.projectId} onChange={e => handleLinkedProjectChange(e.target.value)}>
            <option value="">{t('historyFieldLinkedNone')}</option>
            {allProjects?.map(p => <option key={p.id} value={p.id}>{p.refCode} — {p.name}</option>)}
          </select>
        </Field>
        <Field label={t('historyFieldProject')} required>
          <input className="input" value={historyForm.projectName} onChange={e => setHField('projectName', e.target.value)} placeholder="ex. Ponte 25 de Abril" />
        </Field>
        <Field label={t('historyFieldMacroRegion')}>
          <input className="input" value={historyForm.macroRegion} onChange={e => setHField('macroRegion', e.target.value)} placeholder="ex. EMEA" />
        </Field>
        <Field label={t('historyFieldCountry')}>
          <input className="input" value={historyForm.country} onChange={e => setHField('country', e.target.value)} />
        </Field>
        <Field label={t('historyFieldPlace')}>
          <input className="input" value={historyForm.place} onChange={e => setHField('place', e.target.value)} />
        </Field>
        <Field label={t('historyFieldCategory')}>
          <select className="input" value={historyForm.category} onChange={e => setHField('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{t(CAT_KEY[c])}</option>)}
          </select>
        </Field>
        <Field label={t('historyFieldStartDate')}>
          <input className="input" type="date" value={historyForm.startDate} onChange={e => setHField('startDate', e.target.value)} />
        </Field>
        <Field label={t('historyFieldEndDate')}>
          <input className="input" type="date" value={historyForm.endDate} onChange={e => setHField('endDate', e.target.value)} />
        </Field>
      </div>
      <Field label={t('historyFieldNotes')}>
        <textarea className="input textarea" rows={2} value={historyForm.notes} onChange={e => setHField('notes', e.target.value)} />
      </Field>

      <div className="history-subsection">
        <GeoSection
          entries={historyForm.geoEntries}
          onChange={fn => setHistoryForm(f => ({ ...f, geoEntries: fn(f.geoEntries) }))}
          onFieldChange={(i, k, v) => setHistoryForm(f => ({ ...f, geoEntries: f.geoEntries.map((e, idx) => idx === i ? { ...e, [k]: v } : e) }))}
        />
      </div>
      <div className="history-subsection">
        <StructureSection
          entries={historyForm.structures}
          onChange={fn => setHistoryForm(f => ({ ...f, structures: fn(f.structures) }))}
          onFieldChange={(i, k, v) => setHistoryForm(f => ({ ...f, structures: f.structures.map((e, idx) => idx === i ? { ...e, [k]: v } : e) }))}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>{t('btnCancelHistory')}</button>
        <button type="submit" className="btn-submit" disabled={isPending}>{t('btnSaveHistory')}</button>
      </div>
    </form>
  )
}

// ── Utilities ─────────────────────────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
