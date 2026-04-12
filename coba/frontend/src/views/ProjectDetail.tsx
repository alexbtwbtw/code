import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { trpcClient } from '../trpc'
import type { Suggestion } from '../types/suggestions'
import { downloadSuggestionCv } from '../utils/download'
import { useTranslation } from '../i18n/context'
import type { TranslationKey } from '../i18n/en'
import type { Page } from '../types/pages'
import { GeoSection, StructureSection, Field } from '../components/shared'
import { STRUCT_TYPE_KEY, type GeoFormEntry, type StructureFormEntry } from '../components/shared'
import { STATUSES, CATEGORIES, STATUS_KEY, CAT_KEY, PROJECT_PRIORITIES, PRIORITY_KEY, PRIORITY_COLOR } from '../constants/projects'
import type { ProjectPriority } from '../constants/projects'
import { GEO_TYPE_KEY } from '../constants/geo'
import { TASK_STATUS_KEY, TASK_PRIORITY_KEY, TASK_STATUSES, TASK_PRIORITIES } from '../constants/tasks'
import { fmt, fmtDate, fmtDim, initials } from '../utils/format'
import { useAiEnabled } from '../api/system'
import { useProjectById, useUpdateProject } from '../api/projects'
import { useGeoByProject } from '../api/geo'
import { useStructuresByProject } from '../api/structures'
import { useFeaturesByProject, useCreateFeature, useDeleteFeature } from '../api/features'
import { useTeamByProject, useTeamList, useTagProject, useUntagProject, useSuggestMembers } from '../api/team'
import { useTasksByProject, useCreateTask } from '../api/tasks'
import { useTimeByProject, useCreateTimeEntry, useDeleteTimeEntry } from '../api/timeEntries'
import { getCurrentUser } from '../auth'

interface Props {
  id: number
  onNavigate: (page: Page) => void
}

export default function ProjectDetail({ id, onNavigate }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  // Edit project state
  const [isEditing, setIsEditing] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    refCode: '', name: '', client: '', macroRegion: '', country: '', place: '',
    category: 'other' as string, status: 'planning' as string, priority: 'medium' as string,
    startDate: '', endDate: '', budget: '', currency: 'EUR',
    projectManager: '', teamSize: '', description: '', tags: '',
  })
  const [editGeoEntries, setEditGeoEntries] = useState<GeoFormEntry[]>([])
  const [editStructures, setEditStructures] = useState<StructureFormEntry[]>([])
  const [originalGeoIds, setOriginalGeoIds] = useState<number[]>([])
  const [originalStructureIds, setOriginalStructureIds] = useState<number[]>([])

  // Tag member panel state
  const [showTagPanel, setShowTagPanel] = useState(false)
  const [tagMemberId, setTagMemberId] = useState('')
  const [tagRole, setTagRole] = useState('')

  // Suggest panel state
  const [showSuggestPanel, setShowSuggestPanel] = useState(false)
  const [suggestMode, setSuggestMode] = useState<'ai' | 'local'>('local')
  const [suggestTopN, setSuggestTopN] = useState(5)
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  // Create task form state
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'todo', priority: 'medium', stateSummary: '', dueDate: '' })

  // Create feature form state
  const [showCreateFeature, setShowCreateFeature] = useState(false)
  const [newFeature, setNewFeature] = useState({ label: '', description: '', latitude: '', longitude: '' })

  // Time entry form state
  const [showTimeForm, setShowTimeForm] = useState(false)
  const [newTime, setNewTime] = useState({ date: '', hours: '', description: '' })

  const aiEnabled = useAiEnabled()

  // Queries
  const { data: project, isLoading: loadingProject } = useProjectById(id)
  const { data: geoEntries, isLoading: loadingGeo } = useGeoByProject(id)
  const { data: structures, isLoading: loadingStructures } = useStructuresByProject(id)
  const { data: features, isLoading: loadingFeatures } = useFeaturesByProject(id)
  const { data: projectTeam } = useTeamByProject(id)
  const { data: allMembers } = useTeamList()
  const { data: tasks, isLoading: loadingTasks } = useTasksByProject(id)
  const { data: timeEntries } = useTimeByProject(id)

  // Mutations
  const updateProject  = useUpdateProject()
  const tagMember      = useTagProject()
  const untagMember    = useUntagProject()
  const suggestMembers = useSuggestMembers()
  const createTask     = useCreateTask()
  const createFeature  = useCreateFeature()
  const deleteFeature  = useDeleteFeature()
  const createTimeEntry = useCreateTimeEntry()
  const deleteTimeEntry = useDeleteTimeEntry()

  // ── Edit project ────────────────────────────────────────────────────────────
  function startEditing() {
    if (!project) return
    setForm({
      refCode: project.refCode, name: project.name, client: project.client || '',
      macroRegion: project.macroRegion || '', country: project.country || '', place: project.place || '',
      category: project.category, status: project.status, priority: project.priority || 'medium',
      startDate: project.startDate?.slice(0, 10) || '', endDate: project.endDate?.slice(0, 10) || '',
      budget: project.budget != null ? String(project.budget) : '', currency: project.currency,
      projectManager: project.projectManager || '', teamSize: project.teamSize ? String(project.teamSize) : '',
      description: project.description || '', tags: project.tags || '',
    })
    setOriginalGeoIds((geoEntries || []).map(g => g.id))
    setEditGeoEntries((geoEntries || []).map(g => ({
      pointLabel: g.pointLabel, type: g.type as GeoFormEntry['type'],
      depth: g.depth != null ? String(g.depth) : '', soilType: g.soilType || '',
      rockType: g.rockType || '', groundwaterDepth: g.groundwaterDepth != null ? String(g.groundwaterDepth) : '',
      bearingCapacity: g.bearingCapacity != null ? String(g.bearingCapacity) : '',
      sptNValue: g.sptNValue != null ? String(g.sptNValue) : '', seismicClass: g.seismicClass || '',
      latitude: g.latitude != null ? String(g.latitude) : '', longitude: g.longitude != null ? String(g.longitude) : '',
      sampledAt: g.sampledAt?.slice(0, 10) || '', notes: g.notes || '',
    })))
    setOriginalStructureIds((structures || []).map(s => s.id))
    setEditStructures((structures || []).map(s => ({
      label: s.label, type: s.type as StructureFormEntry['type'], material: s.material || '',
      lengthM: s.lengthM != null ? String(s.lengthM) : '', heightM: s.heightM != null ? String(s.heightM) : '',
      spanM: s.spanM != null ? String(s.spanM) : '', foundationType: s.foundationType || '',
      designLoad: s.designLoad != null ? String(s.designLoad) : '',
      latitude: s.latitude != null ? String(s.latitude) : '', longitude: s.longitude != null ? String(s.longitude) : '',
      builtAt: s.builtAt?.slice(0, 10) || '', notes: s.notes || '',
    })))
    setErrors({})
    setIsEditing(true)
  }

  function setField(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const c = { ...e }; delete c[k]; return c })
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.refCode.trim()) errs.refCode = t('errorRequired')
    if (!form.name.trim()) errs.name = t('errorRequired')
    if (Object.keys(errs).length) { setErrors(errs); return }

    const geoSnapshot = [...editGeoEntries]
    const structSnapshot = [...editStructures]
    const geoIds = [...originalGeoIds]
    const structIds = [...originalStructureIds]

    updateProject.mutate({
      id, refCode: form.refCode, name: form.name, client: form.client,
      macroRegion: form.macroRegion, country: form.country, place: form.place,
      category: form.category as typeof CATEGORIES[number],
      status: form.status as typeof STATUSES[number],
      priority: form.priority as typeof PROJECT_PRIORITIES[number],
      startDate: form.startDate || undefined, endDate: form.endDate || undefined,
      budget: form.budget ? parseFloat(form.budget) : undefined, currency: form.currency,
      projectManager: form.projectManager,
      teamSize: form.teamSize ? parseInt(form.teamSize) : 0,
      description: form.description, tags: form.tags,
    }, {
      onSuccess: async () => {
        for (const gid of geoIds) await trpcClient.geo.delete.mutate({ id: gid })
        for (const g of geoSnapshot) {
          await trpcClient.geo.create.mutate({
            projectId: id, pointLabel: g.pointLabel, type: g.type,
            depth: g.depth ? parseFloat(g.depth) : undefined,
            soilType: g.soilType, rockType: g.rockType,
            groundwaterDepth: g.groundwaterDepth ? parseFloat(g.groundwaterDepth) : undefined,
            bearingCapacity: g.bearingCapacity ? parseFloat(g.bearingCapacity) : undefined,
            sptNValue: g.sptNValue ? parseInt(g.sptNValue) : undefined,
            seismicClass: g.seismicClass, latitude: g.latitude ? parseFloat(g.latitude) : undefined,
            longitude: g.longitude ? parseFloat(g.longitude) : undefined,
            sampledAt: g.sampledAt || undefined, notes: g.notes,
          })
        }
        for (const sid of structIds) await trpcClient.structures.delete.mutate({ id: sid })
        for (const s of structSnapshot) {
          await trpcClient.structures.create.mutate({
            projectId: id, label: s.label, type: s.type, material: s.material,
            lengthM: s.lengthM ? parseFloat(s.lengthM) : undefined,
            heightM: s.heightM ? parseFloat(s.heightM) : undefined,
            spanM: s.spanM ? parseFloat(s.spanM) : undefined,
            foundationType: s.foundationType,
            designLoad: s.designLoad ? parseFloat(s.designLoad) : undefined,
            latitude: s.latitude ? parseFloat(s.latitude) : undefined,
            longitude: s.longitude ? parseFloat(s.longitude) : undefined,
            builtAt: s.builtAt || undefined, notes: s.notes,
          })
        }
        await qc.invalidateQueries({ queryKey: [['geo']] })
        await qc.invalidateQueries({ queryKey: [['structures']] })
        setIsEditing(false)
        setEditSuccess(true)
        setTimeout(() => setEditSuccess(false), 4000)
      },
    })
  }

  // ── Tag member ──────────────────────────────────────────────────────────────
  function handleTagMember(ev: React.FormEvent) {
    ev.preventDefault()
    if (!tagMemberId) return
    tagMember.mutate({ projectId: id, teamMemberId: parseInt(tagMemberId), roleOnProject: tagRole }, {
      onSuccess: () => { setTagMemberId(''); setTagRole(''); setShowTagPanel(false) },
    })
  }

  function handleUntagMember(memberId: number) {
    untagMember.mutate({ projectId: id, teamMemberId: memberId })
  }

  if (loadingProject) return <div className="page-loading">{t('loading')}</div>
  if (!project) return <div className="page-loading">Project not found.</div>

  // ── Edit mode ───────────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="view">
        <div className="view-header"><h1>{t('editTitle')}: {project.name}</h1></div>
        <form className="project-form" onSubmit={handleSave} noValidate>
          <div className="form-section">
            <div className="form-grid form-grid--2">
              <Field label={t('fieldRefCode')} required error={errors.refCode}>
                <input className="input" value={form.refCode} onChange={e => setField('refCode', e.target.value)} />
              </Field>
              <Field label={t('fieldName')} required error={errors.name}>
                <input className="input" value={form.name} onChange={e => setField('name', e.target.value)} />
              </Field>
              <Field label={t('fieldClient')}>
                <input className="input" value={form.client} onChange={e => setField('client', e.target.value)} />
              </Field>
              <Field label={t('fieldPM')}>
                <input className="input" value={form.projectManager} onChange={e => setField('projectManager', e.target.value)} />
              </Field>
            </div>
            <div className="form-grid form-grid--3">
              <Field label={t('fieldMacroRegion')}><input className="input" value={form.macroRegion} onChange={e => setField('macroRegion', e.target.value)} /></Field>
              <Field label={t('fieldCountry')}><input className="input" value={form.country} onChange={e => setField('country', e.target.value)} /></Field>
              <Field label={t('fieldPlace')}><input className="input" value={form.place} onChange={e => setField('place', e.target.value)} /></Field>
            </div>
            <div className="form-grid form-grid--2">
              <Field label={t('fieldCategory')}>
                <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(CAT_KEY[c])}</option>)}
                </select>
              </Field>
              <Field label={t('fieldStatus')}>
                <select className="input" value={form.status} onChange={e => setField('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
                </select>
              </Field>
              <Field label={t('fieldPriority')}>
                <select className="input" value={form.priority} onChange={e => setField('priority', e.target.value)}>
                  {PROJECT_PRIORITIES.map(p => <option key={p} value={p}>{t(PRIORITY_KEY[p])}</option>)}
                </select>
              </Field>
              <Field label={t('fieldStartDate')}><input className="input" type="date" value={form.startDate} onChange={e => setField('startDate', e.target.value)} /></Field>
              <Field label={t('fieldEndDate')}><input className="input" type="date" value={form.endDate} onChange={e => setField('endDate', e.target.value)} /></Field>
              <Field label={t('fieldBudget')}><input className="input" type="number" min="0" value={form.budget} onChange={e => setField('budget', e.target.value)} /></Field>
              <Field label={t('fieldCurrency')}>
                <select className="input" value={form.currency} onChange={e => setField('currency', e.target.value)}>
                  {['EUR','USD','GBP','AOA','MZN'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label={t('fieldTeamSize')}><input className="input" type="number" min="0" value={form.teamSize} onChange={e => setField('teamSize', e.target.value)} /></Field>
              <Field label={t('fieldTags')}><input className="input" value={form.tags} onChange={e => setField('tags', e.target.value)} /></Field>
            </div>
            <Field label={t('fieldDescription')}>
              <textarea className="input textarea" rows={3} value={form.description} onChange={e => setField('description', e.target.value)} />
            </Field>
          </div>

          <GeoSection
            entries={editGeoEntries}
            onChange={setEditGeoEntries}
            onFieldChange={(i, k, v) => setEditGeoEntries(es => es.map((e, idx) => idx === i ? { ...e, [k]: v } : e))}
          />
          <StructureSection
            entries={editStructures}
            onChange={setEditStructures}
            onFieldChange={(i, k, v) => setEditStructures(es => es.map((e, idx) => idx === i ? { ...e, [k]: v } : e))}
          />

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>{t('btnCancelEdit')}</button>
            <button type="submit" className="btn-submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? t('btnSaving') : t('btnSaveChanges')}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ── View mode ───────────────────────────────────────────────────────────────
  return (
    <div className="project-detail-layout">
      <ProjectSidebarNav />
      <div className="project-page">
      {editSuccess && <div className="alert alert--success">{t('successEditMessage')}</div>}

      {/* Hero */}
      <div id="section-overview" className="project-hero">
        <div className="project-hero-top">
          <span className="project-ref">{project.refCode}</span>
          <span className={`status-pill status-pill--${project.status}`}>{t(STATUS_KEY[project.status] ?? 'statusActive')}</span>
          {project.priority && (
            <span className={`priority-badge ${PRIORITY_COLOR[project.priority as ProjectPriority] ?? 'priority--medium'}`}>
              {t(PRIORITY_KEY[project.priority as ProjectPriority] ?? 'priorityMedium')}
            </span>
          )}
          <button className="btn-edit" onClick={startEditing}>{t('btnEdit')}</button>
        </div>
        <h1 className="project-name">{project.name}</h1>
        <p className="project-client">{project.client}</p>
        <div className="project-hero-location">
          {project.macroRegion && <span>{project.macroRegion}</span>}
          {project.macroRegion && project.country && <span className="hero-loc-sep">/</span>}
          {project.country && <span>{project.country}</span>}
          {project.place && <><span className="hero-loc-sep">/</span><span>{project.place}</span></>}
        </div>
      </div>

      {/* Key detail cards */}
      <div className="detail-cards">
        {project.macroRegion && <DetailCard label={t('detailMacroRegion')} value={project.macroRegion} icon="🌍" />}
        <DetailCard label={t('detailCountry')} value={project.country || '—'} icon="🏳️" />
        {project.place && <DetailCard label={t('detailPlace')} value={project.place} icon="📍" />}
        <DetailCard label={t('colCategory')} value={t(CAT_KEY[project.category] ?? 'catOther')} icon="🏗️" />
        <DetailCard label={t('colBudget')} value={fmt(project.budget, project.currency)} icon="💰" />
        <DetailCard label={t('colDates')} value={`${fmtDate(project.startDate)} — ${fmtDate(project.endDate)}`} icon="📅" />
        <DetailCard label={t('colPM')} value={project.projectManager || '—'} icon="👤" />
        <DetailCard label={t('detailTeamSize')} value={project.teamSize ? String(project.teamSize) : '—'} icon="👥" />
      </div>

      {project.description && (
        <section className="detail-section">
          <h2 className="detail-section-title">{t('detailDescription')}</h2>
          <p className="detail-section-body">{project.description}</p>
        </section>
      )}

      {/* Tasks */}
      <section id="section-tasks" className="detail-section">
        <div className="section-heading-row">
          <h2 className="detail-section-title">{t('tasksTitle')}</h2>
          <button className="btn-add-geo" onClick={() => setShowCreateTask(p => !p)}>
            {showCreateTask ? t('btnCancelEdit') : `+ ${t('btnAddTask')}`}
          </button>
        </div>

        {showCreateTask && (
          <form className="task-create-form" onSubmit={ev => {
            ev.preventDefault()
            if (!newTask.title.trim()) return
            createTask.mutate({
              projectId: id, title: newTask.title, description: newTask.description,
              status: newTask.status as typeof TASK_STATUSES[number],
              priority: newTask.priority as typeof TASK_PRIORITIES[number],
              stateSummary: newTask.stateSummary,
              dueDate: newTask.dueDate || undefined,
            }, {
              onSuccess: () => {
                setNewTask({ title: '', description: '', status: 'todo', priority: 'medium', stateSummary: '', dueDate: '' })
                setShowCreateTask(false)
              },
            })
          }}>
            <div className="form-grid form-grid--2">
              <Field label={t('taskFieldTitle')} required>
                <input className="input" value={newTask.title} onChange={e => setNewTask(f => ({ ...f, title: e.target.value }))} />
              </Field>
              <Field label={t('taskFieldDueDate')}>
                <input className="input" type="date" value={newTask.dueDate} onChange={e => setNewTask(f => ({ ...f, dueDate: e.target.value }))} />
              </Field>
            </div>
            <Field label={t('taskFieldDescription')}>
              <textarea className="input textarea" rows={2} value={newTask.description} onChange={e => setNewTask(f => ({ ...f, description: e.target.value }))} />
            </Field>
            <div className="form-grid form-grid--3">
              <Field label={t('taskFieldStatus')}>
                <select className="input" value={newTask.status} onChange={e => setNewTask(f => ({ ...f, status: e.target.value }))}>
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{t(TASK_STATUS_KEY[s])}</option>)}
                </select>
              </Field>
              <Field label={t('taskFieldPriority')}>
                <select className="input" value={newTask.priority} onChange={e => setNewTask(f => ({ ...f, priority: e.target.value }))}>
                  {TASK_PRIORITIES.map(p => <option key={p} value={p}>{t(TASK_PRIORITY_KEY[p])}</option>)}
                </select>
              </Field>
              <Field label={t('taskFieldStateSummary')}>
                <input className="input" value={newTask.stateSummary} onChange={e => setNewTask(f => ({ ...f, stateSummary: e.target.value }))} />
              </Field>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowCreateTask(false)}>{t('btnCancelEdit')}</button>
              <button type="submit" className="btn-submit" disabled={createTask.isPending}>{createTask.isPending ? t('btnSubmitting') : t('btnSaveTask')}</button>
            </div>
          </form>
        )}

        {loadingTasks ? (
          <p className="muted">{t('loading')}</p>
        ) : !tasks?.length ? (
          <p className="muted">{t('tasksEmpty')}</p>
        ) : (
          <>
            <div className="task-status-legend">
              {([
                { status: 'todo',        key: 'taskStatusTodo' as const },
                { status: 'in_progress', key: 'taskStatusInProgress' as const },
                { status: 'review',      key: 'taskStatusReview' as const },
                { status: 'blocked',     key: 'taskStatusBlocked' as const },
                { status: 'done',        key: 'taskStatusDone' as const },
              ] as { status: string; key: TranslationKey }[]).map(({ status, key }) => (
                <span key={status} className="task-status-legend-item">
                  <span className={`task-status-legend-dot task-status-legend-dot--${status}`} />
                  {t(key)}
                </span>
              ))}
            </div>
          <div className="task-list">
            {tasks.map(task => {
              const isOverdue = task.dueDate && task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10)
              return (
                <div key={task.id} className={`task-card task-card--${task.status}`}
                  onClick={() => onNavigate({ view: 'task', id: task.id, projectId: id, projectName: project?.name })}>
                  <div className="task-card-header">
                    <span className={`task-priority-dot task-priority-dot--${task.priority}`} title={t(TASK_PRIORITY_KEY[task.priority])} />
                    <span className="task-card-title">{task.title}</span>
                    <span className={`status-pill status-pill--task-${task.status}`}>{t(TASK_STATUS_KEY[task.status] ?? 'taskStatusTodo')}</span>
                  </div>
                  {task.stateSummary && <p className="task-card-summary">{task.stateSummary}</p>}
                  <div className="task-card-footer">
                    <div className="task-card-assignees">
                      {task.assignees.map(a => (
                        <span key={a.memberId} className="task-assignee-chip" title={a.name}>{initials(a.name)}</span>
                      ))}
                    </div>
                    <div className="task-card-meta">
                      {task.commentCount > 0 && <span className="task-comment-count">💬 {task.commentCount}</span>}
                      {task.dueDate && (
                        <span className={`task-due${isOverdue ? ' task-due--overdue' : ''}`}>
                          {isOverdue && '⚠ '}{t('taskDue')}: {task.dueDate.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </>
        )}
      </section>

      {/* Time Logged */}
      <section className="detail-section">
        {(() => {
          const currentUser = getCurrentUser()
          const totalHours = timeEntries?.reduce((sum, e) => sum + e.hours, 0) ?? 0
          return (
            <>
              <div className="section-heading-row">
                <h2 className="detail-section-title">
                  {t('timeTitle')}
                  {totalHours > 0 && (
                    <span className="time-total-badge"> — {t('timeTotal')}: {totalHours.toFixed(1)} h</span>
                  )}
                </h2>
                <button className="btn-add-geo" onClick={() => setShowTimeForm(p => !p)}>
                  {showTimeForm ? t('btnCancelEdit') : `+ ${t('timeAdd')}`}
                </button>
              </div>

              {showTimeForm && (
                <form className="task-create-form" onSubmit={ev => {
                  ev.preventDefault()
                  if (!currentUser) return
                  if (!newTime.date || !newTime.hours) return
                  createTimeEntry.mutate({
                    projectId: id,
                    memberId: currentUser.id,
                    date: newTime.date,
                    hours: parseFloat(newTime.hours),
                    description: newTime.description,
                  }, {
                    onSuccess: () => {
                      setNewTime({ date: '', hours: '', description: '' })
                      setShowTimeForm(false)
                    },
                  })
                }}>
                  {!currentUser ? (
                    <p className="muted">{t('timeNoUser')}</p>
                  ) : (
                    <>
                      <div className="form-grid form-grid--2">
                        <Field label={t('timeDate')} required>
                          <input className="input" type="date" value={newTime.date} onChange={e => setNewTime(f => ({ ...f, date: e.target.value }))} />
                        </Field>
                        <Field label={t('timeHours')} required>
                          <input className="input" type="number" min="0.1" step="0.1" value={newTime.hours} onChange={e => setNewTime(f => ({ ...f, hours: e.target.value }))} />
                        </Field>
                      </div>
                      <Field label={t('timeDesc')}>
                        <input className="input" value={newTime.description} onChange={e => setNewTime(f => ({ ...f, description: e.target.value }))} />
                      </Field>
                      <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={() => setShowTimeForm(false)}>{t('btnCancelEdit')}</button>
                        <button type="submit" className="btn-submit" disabled={createTimeEntry.isPending || !newTime.date || !newTime.hours}>
                          {createTimeEntry.isPending ? t('btnSubmitting') : t('timeAdd')}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}

              {!timeEntries?.length ? (
                <p className="muted">{t('timeEmpty')}</p>
              ) : (
                <div className="time-list">
                  {timeEntries.map(entry => (
                    <div key={entry.id} className="time-entry">
                      <span className="time-entry-date">{entry.date.slice(0, 10)}</span>
                      <div className="time-entry-meta">
                        <span className="time-entry-who">{entry.memberName}</span>
                        {entry.description && <span className="time-entry-desc">{entry.description}</span>}
                      </div>
                      <span className="time-entry-hours">{entry.hours.toFixed(1)} h</span>
                      <div className="time-entry-actions">
                        <button className="btn-untag" onClick={() => deleteTimeEntry.mutate({ id: entry.id })} title={t('btnRemoveGeo')}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        })()}
      </section>

      {project.tags && (
        <section className="detail-section">
          <h2 className="detail-section-title">{t('detailTags')}</h2>
          <div className="tag-row">
            {project.tags.split(',').map(tag => <span key={tag} className="pill">{tag.trim()}</span>)}
          </div>
        </section>
      )}

      {/* Team members */}
      <section id="section-team" className="detail-section">
        <div className="section-heading-row">
          <h2 className="detail-section-title">{t('projectTeamTitle')}</h2>
          <div className="team-section-actions">
            <button className="btn-secondary btn-sm" onClick={() => { setShowSuggestPanel(p => !p); setShowTagPanel(false); setSuggestions([]) }}>
              {showSuggestPanel ? t('btnCancelEdit') : `✦ ${t('btnSuggestMembers')}`}
            </button>
            <button className="btn-add-geo" onClick={() => { setShowTagPanel(p => !p); setShowSuggestPanel(false) }}>
              {showTagPanel ? t('btnCancelEdit') : `+ ${t('btnTagMember')}`}
            </button>
          </div>
        </div>

        {/* Suggest panel */}
        {showSuggestPanel && (
          <div className="suggest-panel">
            <p className="suggest-panel-title">{t('suggestTitle')}</p>
            <div className="suggest-controls">
              <div className="suggest-mode-tabs">
                <button type="button"
                  className={`suggest-mode-btn${suggestMode === 'local' ? ' suggest-mode-btn--active' : ''}`}
                  onClick={() => setSuggestMode('local')}>
                  {t('suggestModeLocal')}
                </button>
                <button type="button"
                  className={`suggest-mode-btn${suggestMode === 'ai' ? ' suggest-mode-btn--active' : ''}`}
                  onClick={() => setSuggestMode('ai')}
                  disabled={!aiEnabled}
                  title={!aiEnabled ? t('aiDisabled') : undefined}>
                  {t('suggestModeAi')}
                </button>
              </div>
              {suggestMode === 'ai' && (
                <label className="suggest-topn-label">
                  {t('suggestTopN')}
                  <input className="input suggest-topn-input" type="number" min={1} max={20} value={suggestTopN}
                    onChange={e => setSuggestTopN(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))} />
                </label>
              )}
              <button className="btn-submit btn-sm" disabled={suggestMembers.isPending}
                onClick={() => {
                  suggestMembers.mutate(
                    { projectId: id, mode: suggestMode, topN: suggestMode === 'ai' ? suggestTopN : 5 },
                    { onSuccess: data => setSuggestions(data as Suggestion[]) }
                  )
                }}>
                {suggestMembers.isPending ? t('suggestLoading') : t('btnFindMatches')}
              </button>
            </div>

            {suggestions.length > 0 && (
              <div className="suggest-results">
                {suggestions.map((s, i) => {
                  const alreadyTagged = projectTeam?.some(pt => pt.id === s.memberId)
                  const isExpanded = expandedSuggestion === s.memberId
                  return (
                    <div key={s.memberId} className={`suggest-card${isExpanded ? ' suggest-card--expanded' : ''}`}>
                      <div className="suggest-card-rank">#{i + 1}</div>
                      <div className="suggest-card-avatar">{initials(s.name)}</div>
                      <div className="suggest-card-body">
                        <div className="suggest-card-header">
                          <button className="suggest-card-name-btn" onClick={() => onNavigate({ view: 'member', id: s.memberId, name: s.name })}>
                            {s.name}
                          </button>
                          {s.title && <span className="suggest-card-title">{s.title}</span>}
                          {s.score != null && (
                            <span className="suggest-score">{t('suggestScoreLabel')}: {s.score}</span>
                          )}
                          <span className="suggest-card-badges">
                            {(s.projectCount ?? 0) > 0 && <span className="suggest-badge" title={t('memberDetailProjects')}>{s.projectCount} proj.</span>}
                            {(s.historyCount ?? 0) > 0 && <span className="suggest-badge">{s.historyCount} hist.</span>}
                          </span>
                        </div>
                        <p className="suggest-card-rationale">{s.rationale}</p>
                        {s.evidence && (
                          <blockquote className="suggest-evidence">"{s.evidence}"</blockquote>
                        )}
                        <div className="suggest-card-links">
                          {s.cvId && (
                            <button className="suggest-cv-btn" onClick={() => downloadSuggestionCv(s.cvId!, s.cvFilename ?? 'cv.pdf')}>
                              📄 {t('memberCvDownload')}
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="suggest-card-detail">
                            {s.email && <p className="suggest-detail-contact">✉ {s.email}</p>}
                            {s.bio && <p className="suggest-detail-bio">{s.bio}</p>}
                            {s.recentHistory && s.recentHistory.length > 0 && (
                              <div className="suggest-detail-history">
                                {s.recentHistory.map((h, hi) => (
                                  <span key={hi} className="suggest-history-chip">
                                    <span className="pill pill--sm pill--cat">{h.category}</span>
                                    {h.projectName}{h.country ? ` · ${h.country}` : ''}
                                  </span>
                                ))}
                                {(s.historyCount ?? 0) > 3 && (
                                  <span className="suggest-history-more">+{(s.historyCount ?? 0) - 3} mais</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="suggest-card-actions">
                        <button className="suggest-expand-btn" title={isExpanded ? 'Recolher' : 'Expandir'}
                          onClick={() => setExpandedSuggestion(isExpanded ? null : s.memberId)}>
                          {isExpanded ? '▲' : '▼'}
                        </button>
                        {!alreadyTagged && (
                          <button className="btn-submit btn-sm suggest-tag-btn"
                            disabled={tagMember.isPending}
                            onClick={() => tagMember.mutate(
                              { projectId: id, teamMemberId: s.memberId, roleOnProject: '' }
                            )}>
                            {t('btnTagSuggested')}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!suggestMembers.isPending && suggestMembers.isSuccess && suggestions.length === 0 && (
              <p className="muted">{t('suggestNoResults')}</p>
            )}
          </div>
        )}

        {showTagPanel && (
          <form className="tag-member-panel" onSubmit={handleTagMember}>
            <div className="form-grid form-grid--2">
              <Field label={t('tagMemberSelect')}>
                <select className="input" value={tagMemberId} onChange={e => setTagMemberId(e.target.value)} required>
                  <option value="">{t('tagMemberSelect')}</option>
                  {allMembers?.filter(m => !projectTeam?.some(pt => pt.id === m.id))
                    .map(m => <option key={m.id} value={m.id}>{m.name}{m.title ? ` — ${m.title}` : ''}</option>)}
                </select>
              </Field>
              <Field label={t('tagMemberRole')}>
                <input className="input" value={tagRole} onChange={e => setTagRole(e.target.value)} placeholder="ex. Geotechnical Lead" />
              </Field>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowTagPanel(false)}>{t('btnCancelEdit')}</button>
              <button type="submit" className="btn-submit" disabled={!tagMemberId || tagMember.isPending}>{t('btnTagMember')}</button>
            </div>
          </form>
        )}
        {!projectTeam?.length ? (
          <p className="muted">{t('projectTeamNoMembers')}</p>
        ) : (
          <div className="tagged-projects-list">
            {projectTeam.map(m => (
              <div key={m.id} className="tagged-project-row">
                <div className="tagged-member-avatar">{initials(m.name)}</div>
                <span className="tagged-project-name">{m.name}</span>
                {m.title && <span className="tagged-project-role">{m.title}</span>}
                {m.roleOnProject && <span className="tagged-project-role tagged-project-role--on">({m.roleOnProject})</span>}
                <button className="btn-untag" onClick={() => handleUntagMember(m.id)} title={t('btnUntagMember')}>✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Structures */}
      <section id="section-structures" className="detail-section">
        <h2 className="detail-section-title">{t('detailStructures')}</h2>
        {loadingStructures ? (
          <p className="muted">{t('loading')}</p>
        ) : !structures?.length ? (
          <p className="muted">{t('noStructures')}</p>
        ) : (
          <div className="structure-grid">
            {structures.map(s => (
              <div key={s.id} className="structure-card">
                <div className="structure-card-header">
                  <span className="structure-card-label">{s.label}</span>
                  <span className="structure-card-type">{t(STRUCT_TYPE_KEY[s.type] ?? 'structTypeOther')}</span>
                </div>
                {s.material && <p className="structure-card-material">{s.material}</p>}
                <div className="structure-card-dims">
                  {[fmtDim('L', s.lengthM), fmtDim('H', s.heightM), fmtDim('Span', s.spanM)]
                    .filter(Boolean).map((d, i) => <span key={i}>{d}</span>)}
                </div>
                <div className="geo-card-body">
                  {s.foundationType && <GeoRow label={t('structFieldFoundation')} value={s.foundationType} />}
                  {s.designLoad != null && <GeoRow label={t('structFieldLoad')} value={`${s.designLoad} kN/m²`} />}
                  {s.builtAt && <GeoRow label={t('structFieldBuilt')} value={fmtDate(s.builtAt)} />}
                </div>
                {s.notes && <p className="geo-card-notes">{s.notes}</p>}
                {s.latitude != null && s.longitude != null && (
                  <p className="geo-card-coords">{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Project Features */}
      <section id="section-features" className="detail-section">
        <div className="section-heading-row">
          <h2 className="detail-section-title">{t('detailFeatures')}</h2>
          <button className="btn-add-geo" onClick={() => setShowCreateFeature(p => !p)}>
            {showCreateFeature ? t('btnCancelEdit') : `+ ${t('btnAddFeature')}`}
          </button>
        </div>

        {showCreateFeature && (
          <form className="task-create-form" onSubmit={ev => {
            ev.preventDefault()
            if (!newFeature.label.trim()) return
            createFeature.mutate({
              projectId: id,
              label: newFeature.label,
              description: newFeature.description,
              latitude: newFeature.latitude ? parseFloat(newFeature.latitude) : undefined,
              longitude: newFeature.longitude ? parseFloat(newFeature.longitude) : undefined,
            }, {
              onSuccess: () => {
                setNewFeature({ label: '', description: '', latitude: '', longitude: '' })
                setShowCreateFeature(false)
              },
            })
          }}>
            <div className="form-grid form-grid--2">
              <Field label={t('featureFieldLabel')} required>
                <input className="input" value={newFeature.label} onChange={e => setNewFeature(f => ({ ...f, label: e.target.value }))} />
              </Field>
              <Field label={t('featureFieldDescription')}>
                <input className="input" value={newFeature.description} onChange={e => setNewFeature(f => ({ ...f, description: e.target.value }))} />
              </Field>
              <Field label={t('featureFieldLat')}>
                <input className="input" type="number" step="any" value={newFeature.latitude} onChange={e => setNewFeature(f => ({ ...f, latitude: e.target.value }))} />
              </Field>
              <Field label={t('featureFieldLon')}>
                <input className="input" type="number" step="any" value={newFeature.longitude} onChange={e => setNewFeature(f => ({ ...f, longitude: e.target.value }))} />
              </Field>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowCreateFeature(false)}>{t('btnCancelEdit')}</button>
              <button type="submit" className="btn-submit" disabled={createFeature.isPending}>{createFeature.isPending ? t('btnSubmitting') : t('btnAddFeature')}</button>
            </div>
          </form>
        )}

        {loadingFeatures ? (
          <p className="muted">{t('loading')}</p>
        ) : !features?.length ? (
          <p className="muted">{t('noFeatures')}</p>
        ) : (
          <div className="geo-grid">
            {features.map(f => (
              <div key={f.id} className="geo-card">
                <div className="geo-card-header">
                  <span className="geo-card-label">{f.label}</span>
                  <button className="btn-untag" onClick={() => deleteFeature.mutate({ id: f.id })} title={t('btnRemoveGeo')}>✕</button>
                </div>
                {f.description && <p className="geo-card-notes">{f.description}</p>}
                {f.latitude != null && f.longitude != null && (
                  <p className="geo-card-coords">{f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Geological entries */}
      <section id="section-geo" className="detail-section">
        <h2 className="detail-section-title">{t('detailGeo')}</h2>
        {loadingGeo ? (
          <p className="muted">{t('loading')}</p>
        ) : !geoEntries?.length ? (
          <p className="muted">{t('noGeoEntries')}</p>
        ) : (
          <div className="geo-grid">
            {geoEntries.map(g => (
              <div key={g.id} className="geo-card">
                <div className="geo-card-header">
                  <span className="geo-card-label">{g.pointLabel}</span>
                  <span className="geo-card-type">{t(GEO_TYPE_KEY[g.type] ?? 'geoTypeBorehole')}</span>
                </div>
                <div className="geo-card-body">
                  <GeoRow label={t('geoColDepth')} value={g.depth != null ? `${g.depth} m` : '—'} />
                  <GeoRow label={t('geoColSoil')} value={g.soilType || '—'} />
                  <GeoRow label={t('geoColRock')} value={g.rockType || '—'} />
                  <GeoRow label={t('geoColGW')} value={g.groundwaterDepth != null ? `${g.groundwaterDepth} m` : '—'} />
                  <GeoRow label={t('geoColBC')} value={g.bearingCapacity != null ? `${g.bearingCapacity} kPa` : '—'} />
                  <GeoRow label={t('geoColSPT')} value={g.sptNValue != null ? String(g.sptNValue) : '—'} />
                  <GeoRow label={t('geoColSeismic')} value={g.seismicClass || '—'} />
                  <GeoRow label={t('geoColSampled')} value={fmtDate(g.sampledAt)} />
                </div>
                {g.notes && <p className="geo-card-notes">{g.notes}</p>}
                {g.latitude != null && g.longitude != null && (
                  <p className="geo-card-coords">{g.latitude.toFixed(4)}, {g.longitude.toFixed(4)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="detail-back">
        <button className="btn-back" onClick={() => onNavigate({ view: 'search' })}>&larr; {t('navSearch')}</button>
      </div>
    </div>
    </div>
  )
}

// ── Sidebar nav ─────────────────────────────────────────────────────────────
const SIDEBAR_SECTIONS = [
  { id: 'section-overview',    labelKey: 'sidebarOverview'    as const },
  { id: 'section-tasks',       labelKey: 'sidebarTasks'       as const },
  { id: 'section-team',        labelKey: 'sidebarTeam'        as const },
  { id: 'section-structures',  labelKey: 'sidebarStructures'  as const },
  { id: 'section-features',    labelKey: 'sidebarFeatures'    as const },
  { id: 'section-geo',         labelKey: 'sidebarGeo'         as const },
]

function ProjectSidebarNav() {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string>('section-overview')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const candidates: { id: string; top: number }[] = []

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const idx = candidates.findIndex(c => c.id === entry.target.id)
          if (idx !== -1) {
            candidates[idx].top = entry.isIntersecting
              ? (entry.target as HTMLElement).getBoundingClientRect().top
              : Infinity
          }
        })
        // Pick the section with smallest positive top (closest to top of viewport)
        const visible = candidates.filter(c => c.top < Infinity).sort((a, b) => a.top - b.top)
        if (visible.length > 0) setActiveId(visible[0].id)
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    SIDEBAR_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) {
        candidates.push({ id, top: Infinity })
        observerRef.current!.observe(el)
      }
    })

    return () => observerRef.current?.disconnect()
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="project-sidebar-nav" aria-label="Page sections">
      <ul className="project-sidebar-list">
        {SIDEBAR_SECTIONS.map(({ id, labelKey }) => (
          <li key={id}>
            <button
              className={`project-sidebar-item${activeId === id ? ' project-sidebar-item--active' : ''}`}
              onClick={() => scrollTo(id)}
            >
              {t(labelKey)}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function DetailCard({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <div className="detail-card">
      {icon && <span className="detail-card-icon">{icon}</span>}
      <p className="detail-card-label">{label}</p>
      <p className="detail-card-value">{value}</p>
    </div>
  )
}

function GeoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="geo-row">
      <span className="geo-row-label">{label}</span>
      <span className="geo-row-value">{value}</span>
    </div>
  )
}
