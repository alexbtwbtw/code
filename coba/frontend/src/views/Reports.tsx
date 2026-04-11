import { useState } from 'react'
import { useTranslation } from '../i18n/context'
import type { Page } from '../App'
import { TASK_STATUS_KEY, TASK_PRIORITY_KEY } from '../constants/tasks'
import { PRIORITY_KEY, PRIORITY_COLOR } from '../constants/projects'
import { initials } from '../utils/format'
import { useProjectStats, usePriorityList } from '../api/projects'
import { useOverdueTasks, useNearDeadlineTasks, useBlockedTasks, useTasksByProject } from '../api/tasks'

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning', active: 'Active', completed: 'Completed',
  suspended: 'Suspended', cancelled: 'Cancelled',
}
const CATEGORY_LABELS: Record<string, string> = {
  water: 'Water & Environment', transport: 'Transport', energy: 'Energy',
  environment: 'Environment', planning: 'Planning', other: 'Other',
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

type ActiveTab = 'summary' | 'tasks' | 'team' | 'priority'

interface Props {
  onNavigate?: (page: Page) => void
}

export default function Reports({ onNavigate }: Props) {
  const { t } = useTranslation()
  const [activeOnly, setActiveOnly] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks')
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set())

  function toggleExpand(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    setExpandedProjects(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const { data, isLoading } = useProjectStats(activeOnly ? { status: 'active' } : {})
  const { data: overdueTasks } = useOverdueTasks()
  const { data: nearDeadlineTasks } = useNearDeadlineTasks()
  const { data: blockedTasks } = useBlockedTasks()
  const { data: priorityList } = usePriorityList()

  if (isLoading) return <div className="view"><p className="muted">{t('loading')}</p></div>
  if (!data) return null

  const completed = data.byStatus.find(s => s.status === 'completed')?.n ?? 0
  const active = data.byStatus.find(s => s.status === 'active')?.n ?? 0

  return (
    <div className="view">
      <div className="view-header">
        <h1>{t('reportsTitle')}</h1>
        <p className="view-sub">{t('reportsSubtitle')}</p>
      </div>

      {/* Tab bar */}
      <div className="report-filter-bar">
        <button
          className={`report-filter-btn${activeTab === 'summary' ? ' report-filter-btn--active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          {t('reportsTabSummary')}
        </button>
        <button
          className={`report-filter-btn${activeTab === 'tasks' ? ' report-filter-btn--active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          {t('reportsTabTasks')}
        </button>
        <button
          className={`report-filter-btn${activeTab === 'team' ? ' report-filter-btn--active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          {t('reportsTabTeam')}
        </button>
        <button
          className={`report-filter-btn${activeTab === 'priority' ? ' report-filter-btn--active' : ''}`}
          onClick={() => setActiveTab('priority')}
        >
          {t('tabPriority')}
        </button>
      </div>

      {/* ── Summary tab ── */}
      {activeTab === 'summary' && (
        <>
          {/* Filter toggle */}
          <div className="report-filter-bar">
            <button
              className={`report-filter-btn${!activeOnly ? ' report-filter-btn--active' : ''}`}
              onClick={() => setActiveOnly(false)}
            >
              {t('reportsFilterAll')}
            </button>
            <button
              className={`report-filter-btn${activeOnly ? ' report-filter-btn--active' : ''}`}
              onClick={() => setActiveOnly(true)}
            >
              {t('reportsFilterActive')}
            </button>
          </div>

          {/* KPI cards */}
          <div className="kpi-grid">
            <KpiCard label={t('statTotal')} value={String(data.total)} accent="navy" />
            <KpiCard label={t('statActive')} value={String(active)} accent="orange" />
            <KpiCard label={t('statCompleted')} value={String(completed)} accent="green" />
            <KpiCard label={t('statBudget')} value={fmt(data.totalBudget)} accent="blue" />
          </div>

          {/* Tables row */}
          <div className="report-tables">
            <ReportTable
              title={t('tableByStatus')}
              rows={data.byStatus.map(r => ({ key: STATUS_LABELS[r.status] ?? r.status, value: r.n }))}
              countLabel={t('colCount')}
            />
            <ReportTable
              title={t('tableByCategory')}
              rows={data.byCategory.map(r => ({ key: CATEGORY_LABELS[r.category] ?? r.category, value: r.n }))}
              countLabel={t('colCount')}
            />
            <ReportTable
              title={t('tableByCountry')}
              rows={data.byCountry.map(r => ({ key: r.country || '—', value: r.n }))}
              countLabel={t('colCount')}
            />
            <ReportTable
              title={t('tableByYear')}
              rows={data.byYear.map(r => ({ key: r.year ?? '—', value: r.n }))}
              countLabel={t('colCount')}
            />
          </div>
        </>
      )}

      {/* ── Tasks tab ── */}
      {activeTab === 'tasks' && (
        <>
          {/* Near deadline tasks */}
          <div className="report-overdue-section">
            <h2 className="report-overdue-title report-near-deadline-title">{t('reportsNearDeadlineTitle')}</h2>
            {!nearDeadlineTasks?.length ? (
              <p className="muted">{t('reportsNearDeadlineEmpty')}</p>
            ) : (
              <div className="task-list">
                {nearDeadlineTasks.map(task => (
                  <div key={task.id} className={`task-card task-card--${task.status}`}
                    onClick={() => onNavigate?.({ view: 'task', id: task.id, projectId: task.projectId, projectName: task.projectName })}
                    style={{ cursor: onNavigate ? 'pointer' : undefined }}>
                    <div className="task-card-header">
                      <span className={`task-priority-dot task-priority-dot--${task.priority}`} title={t(TASK_PRIORITY_KEY[task.priority])} />
                      <span className="task-card-title">{task.title}</span>
                      <span className={`status-pill status-pill--task-${task.status}`}>{t(TASK_STATUS_KEY[task.status] ?? 'taskStatusTodo')}</span>
                    </div>
                    <div className="task-card-footer">
                      <div className="task-card-footer-left">
                        <span className="task-card-project">{task.projectName}</span>
                        <div className="task-card-assignees">
                          {task.assignees.map(a => (
                            <span key={a.memberId} className="task-assignee-chip" title={a.name}>{initials(a.name)}</span>
                          ))}
                        </div>
                      </div>
                      <div className="task-card-meta">
                        {task.commentCount > 0 && <span className="task-comment-count">💬 {task.commentCount}</span>}
                        {task.dueDate && (
                          <span className="task-due task-due--warning">
                            ⏰ {t('taskDue')}: {task.dueDate.slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue tasks */}
          <div className="report-overdue-section">
            <h2 className="report-overdue-title">{t('reportsOverdueTitle')}</h2>
            {!overdueTasks?.length ? (
              <p className="muted">{t('reportsOverdueEmpty')}</p>
            ) : (
              <div className="task-list">
                {overdueTasks.map(task => (
                  <div key={task.id} className={`task-card task-card--${task.status}`}
                    onClick={() => onNavigate?.({ view: 'task', id: task.id, projectId: task.projectId, projectName: task.projectName })}
                    style={{ cursor: onNavigate ? 'pointer' : undefined }}>
                    <div className="task-card-header">
                      <span className={`task-priority-dot task-priority-dot--${task.priority}`} title={t(TASK_PRIORITY_KEY[task.priority])} />
                      <span className="task-card-title">{task.title}</span>
                      <span className={`status-pill status-pill--task-${task.status}`}>{t(TASK_STATUS_KEY[task.status] ?? 'taskStatusTodo')}</span>
                    </div>
                    <div className="task-card-footer">
                      <div className="task-card-footer-left">
                        <span className="task-card-project">{task.projectName}</span>
                        <div className="task-card-assignees">
                          {task.assignees.map(a => (
                            <span key={a.memberId} className="task-assignee-chip" title={a.name}>{initials(a.name)}</span>
                          ))}
                        </div>
                      </div>
                      <div className="task-card-meta">
                        {task.commentCount > 0 && <span className="task-comment-count">💬 {task.commentCount}</span>}
                        {task.dueDate && (
                          <span className="task-due task-due--overdue">
                            ⚠ {t('taskDue')}: {task.dueDate.slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blocked tasks */}
          <div className="report-overdue-section">
            <h2 className="report-overdue-title">{t('reportsBlockedTitle')}</h2>
            {!blockedTasks?.length ? (
              <p className="muted">{t('reportsBlockedEmpty')}</p>
            ) : (
              <div className="task-list">
                {blockedTasks.map(task => (
                  <div key={task.id} className={`task-card task-card--${task.status}`}
                    onClick={() => onNavigate?.({ view: 'task', id: task.id, projectId: task.projectId, projectName: task.projectName })}
                    style={{ cursor: onNavigate ? 'pointer' : undefined }}>
                    <div className="task-card-header">
                      <span className={`task-priority-dot task-priority-dot--${task.priority}`} title={t(TASK_PRIORITY_KEY[task.priority])} />
                      <span className="task-card-title">{task.title}</span>
                      <span className={`status-pill status-pill--task-${task.status}`}>{t(TASK_STATUS_KEY[task.status] ?? 'taskStatusTodo')}</span>
                    </div>
                    <div className="task-card-footer">
                      <div className="task-card-footer-left">
                        <span className="task-card-project">{task.projectName}</span>
                        <div className="task-card-assignees">
                          {task.assignees.map(a => (
                            <span key={a.memberId} className="task-assignee-chip" title={a.name}>{initials(a.name)}</span>
                          ))}
                        </div>
                      </div>
                      <div className="task-card-meta">
                        {task.commentCount > 0 && <span className="task-comment-count">💬 {task.commentCount}</span>}
                        {task.dueDate && (
                          <span className="task-due task-due--overdue">
                            ⚠ {t('taskDue')}: {task.dueDate.slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Team tab ── */}
      {activeTab === 'team' && (
        <div className="report-overdue-section">
          <p className="muted">{t('reportsTeamComingSoon')}</p>
        </div>
      )}

      {/* ── Priority tab ── */}
      {activeTab === 'priority' && (
        <div className="report-overdue-section">
          <h2 className="report-overdue-title">{t('priorityListTitle')}</h2>
          {!priorityList?.length ? (
            <p className="muted">{t('noResults')}</p>
          ) : (
            <div className="priority-list-table-wrap">
              <table className="priority-list-table">
                <thead>
                  <tr>
                    <th style={{ width: '2rem' }} />
                    <th>{t('fieldPriority')}</th>
                    <th>{t('colRef')}</th>
                    <th>{t('colName')}</th>
                    <th>{t('colPM')}</th>
                    <th>{t('colTaskProgress')}</th>
                    <th>{t('homeColBlocked')}</th>
                    <th>{t('homeColOverdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {priorityList.map(project => {
                    const pKey = PRIORITY_KEY[project.priority as keyof typeof PRIORITY_KEY]
                    const pColor = PRIORITY_COLOR[project.priority as keyof typeof PRIORITY_COLOR]
                    const progressPct = project.totalTasks > 0
                      ? Math.round((project.doneTasks / project.totalTasks) * 100)
                      : 0
                    const isExpanded = expandedProjects.has(project.id)
                    return (
                      <>
                        <tr
                          key={project.id}
                          className={`priority-list-row${isExpanded ? ' priority-list-row--expanded' : ''}`}
                          onClick={() => onNavigate?.({ view: 'project', id: project.id })}
                          style={{ cursor: onNavigate ? 'pointer' : undefined }}
                        >
                          <td>
                            <button
                              className={`priority-expand-btn${isExpanded ? ' priority-expand-btn--open' : ''}`}
                              onClick={e => toggleExpand(project.id, e)}
                              title={isExpanded ? 'Fechar tarefas' : 'Ver tarefas'}
                            >
                              ›
                            </button>
                          </td>
                          <td>
                            <span className={`priority-badge ${pColor ?? ''}`}>
                              {pKey ? t(pKey) : project.priority}
                            </span>
                          </td>
                          <td className="priority-list-ref">{project.refCode}</td>
                          <td className="priority-list-name">{project.name}</td>
                          <td className="priority-list-pm">{project.projectManager ?? '—'}</td>
                          <td className="priority-list-progress">
                            <span className="priority-progress-label">
                              {project.doneTasks}/{project.totalTasks} concluídas
                            </span>
                            <div className="priority-progress-bar">
                              <div
                                className="priority-progress-fill"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </td>
                          <td className={project.blockedTasks > 0 ? 'priority-count-red' : ''}>
                            {project.blockedTasks}
                          </td>
                          <td className={project.overdueTasks > 0 ? 'priority-count-red' : ''}>
                            {project.overdueTasks}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${project.id}-tasks`} className="priority-tasks-row">
                            <td colSpan={8}>
                              <ProjectTasksExpanded
                                projectId={project.id}
                                onNavigate={onNavigate}
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectTasksExpanded({ projectId, onNavigate }: { projectId: number; onNavigate?: (page: Page) => void }) {
  const { t } = useTranslation()
  const { data: tasks, isLoading } = useTasksByProject(projectId)

  if (isLoading) return <p className="muted" style={{ padding: '0.5rem 1rem' }}>{t('loading')}</p>
  if (!tasks?.length) return <p className="muted" style={{ padding: '0.5rem 1rem' }}>Sem tarefas</p>

  return (
    <div className="priority-tasks-list">
      {tasks.map(task => (
        <div
          key={task.id}
          className={`priority-task-item priority-task-item--${task.status}`}
          onClick={() => onNavigate?.({ view: 'task', id: task.id, projectId, projectName: '' })}
          style={{ cursor: onNavigate ? 'pointer' : undefined }}
        >
          <span className={`task-priority-dot task-priority-dot--${task.priority}`} title={t(TASK_PRIORITY_KEY[task.priority])} />
          <div className="priority-task-body">
            <span className="priority-task-title">{task.title}</span>
            {task.stateSummary && <p className="priority-task-summary">{task.stateSummary}</p>}
          </div>
          <span className={`status-pill status-pill--task-${task.status}`}>{t(TASK_STATUS_KEY[task.status] ?? 'taskStatusTodo')}</span>
          {task.dueDate && (
            <span className={`priority-task-due${new Date(task.dueDate) < new Date() && task.status !== 'done' ? ' priority-task-due--overdue' : ''}`}>
              {t('taskDue')}: {task.dueDate.slice(0, 10)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`kpi-card kpi-card--${accent}`}>
      <p className="kpi-value">{value}</p>
      <p className="kpi-label">{label}</p>
    </div>
  )
}

function ReportTable({ title, rows, countLabel }: {
  title: string
  rows: { key: string; value: number }[]
  countLabel: string
}) {
  const total = rows.reduce((s, r) => s + r.value, 0)
  return (
    <div className="report-table-card">
      <h3 className="report-table-title">{title}</h3>
      <table className="report-table">
        <tbody>
          {rows.map(r => (
            <tr key={r.key}>
              <td>{r.key}</td>
              <td className="report-count">{r.value}</td>
              <td className="report-bar-cell">
                <div className="report-bar">
                  <div className="report-bar-fill" style={{ width: `${total ? (r.value / total) * 100 : 0}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="report-total">{countLabel}: <strong>{total}</strong></p>
    </div>
  )
}
