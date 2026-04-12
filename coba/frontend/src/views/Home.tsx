import { useState } from 'react'
import { useTranslation } from '../i18n/context'
import { useCurrentUser } from '../auth'
import type { CurrentUser } from '../auth'
import type { Page } from '../App'
import { useProjectStats, useProjectsList, useMyProjects, useRiskSummary } from '../api/projects'
import { useOverdueTasks, useNearDeadlineTasks, useMyOverdueTasks, useMyNearDeadlineTasks, useBlockedTasks } from '../api/tasks'

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  onNavigate: (page: Page) => void
}

export default function Home({ onNavigate }: Props) {
  const { user } = useCurrentUser()
  if (user?.role === 'oversight') return <OversightHome onNavigate={onNavigate} user={user} />
  return <UserHome onNavigate={onNavigate} user={user} />
}

// ── User Home ────────────────────────────────────────────────────────────────

function UserHome({ onNavigate, user }: Props & { user: CurrentUser | null }) {
  const { t } = useTranslation()

  const { data: stats } = useProjectStats({})
  const { data: myProjects } = useMyProjects(user?.id ?? 0)
  const { data: allActiveProjects } = useProjectsList({ status: 'active', sortBy: 'newest' })

  const { data: myOverdueData } = useMyOverdueTasks(user?.id ?? 0)
  const { data: globalOverdueData } = useOverdueTasks()
  const { data: myNearDeadlineData } = useMyNearDeadlineTasks(user?.id ?? 0)
  const { data: globalNearDeadlineData } = useNearDeadlineTasks()

  const overdueTasks = user ? myOverdueData : globalOverdueData
  const nearDeadlineTasks = user ? myNearDeadlineData : globalNearDeadlineData

  const activeCount = stats?.byStatus.find(s => s.status === 'active')?.n ?? 0
  const recentProjects = (user ? myProjects?.slice(0, 5) : allActiveProjects?.slice(0, 5)) ?? []
  const myProjectCount = myProjects?.length ?? 0
  const overdueCount = overdueTasks?.length ?? 0
  const nearDeadlineCount = nearDeadlineTasks?.length ?? 0

  return (
    <div className="view">
      <div className="home-hero">
        <h1 className="home-hero-title">{t('homeTagline')}</h1>
        <p className="home-hero-sub">{t('homeDescription')}</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card kpi-card--navy">
          <p className="kpi-value">{stats?.total ?? '—'}</p>
          <p className="kpi-label">{t('statTotal')}</p>
        </div>
        <div className="kpi-card kpi-card--orange">
          <p className="kpi-value">{activeCount}</p>
          <p className="kpi-label">{t('statActive')}</p>
        </div>
        <div className="kpi-card kpi-card--blue">
          <p className="kpi-value">{myProjectCount}</p>
          <p className="kpi-label">{t('homeMyProjects')}</p>
        </div>
        <div className="kpi-card kpi-card--green">
          <p className="kpi-value">{stats ? fmt(stats.totalBudget) : '—'}</p>
          <p className="kpi-label">{t('statBudget')}</p>
        </div>
      </div>

      <div className="home-grid">
        <section>
          <p className="home-section-title">{user ? t('homeMyProjects') : t('homeRecentProjects')}</p>
          {recentProjects.length === 0 ? (
            <p className="muted">{t('homeNoRecentProjects')}</p>
          ) : (
            <div className="home-project-list">
              {recentProjects.map(proj => (
                <button
                  key={proj.id}
                  className={`home-project-row home-project-row--${proj.status}`}
                  onClick={() => onNavigate({ view: 'project', id: proj.id, name: proj.name })}
                >
                  <div className="home-project-main">
                    <p className="home-project-ref">{proj.refCode}{proj.country ? ` · ${proj.country}` : ''}</p>
                    <p className="home-project-name">{proj.name}</p>
                    {proj.client && <p className="home-project-client">{proj.client}</p>}
                  </div>
                  <div className="home-project-meta">
                    <span className={`status-pill status-pill--${proj.status}`}>{t(`status${proj.status.charAt(0).toUpperCase() + proj.status.slice(1)}` as any)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="home-right">
          <section className="home-right-section">
            <p className="home-section-title">{t('homeUrgentTasks')}</p>
            <button
              className={`home-alert-row${overdueCount > 0 ? ' home-alert-row--danger' : ''}`}
              onClick={() => onNavigate({ view: 'reports' })}
            >
              <span>{t('homeOverdueTasks')}</span>
              <span className={`home-alert-count${overdueCount > 0 ? ' home-alert-count--danger' : ''}`}>{overdueCount}</span>
            </button>
            <button
              className={`home-alert-row${nearDeadlineCount > 0 ? ' home-alert-row--warning' : ''}`}
              onClick={() => onNavigate({ view: 'reports' })}
            >
              <span>{t('homeNearDeadlineTasks')}</span>
              <span className={`home-alert-count${nearDeadlineCount > 0 ? ' home-alert-count--warning' : ''}`}>{nearDeadlineCount}</span>
            </button>
          </section>

          <section className="home-right-section">
            <p className="home-section-title">{t('homeQuickActions')}</p>
            <div className="home-action-list">
              <button className="home-action-btn" onClick={() => onNavigate({ view: 'search' })}>{t('homeBtnViewProjects')}</button>
              <button className="home-action-btn" onClick={() => onNavigate({ view: 'add' })}>{t('homeBtnAddProject')}</button>
              <button className="home-action-btn" onClick={() => onNavigate({ view: 'team' })}>{t('homeBtnViewTeam')}</button>
              <button className="home-action-btn" onClick={() => onNavigate({ view: 'reports' })}>{t('homeBtnViewReports')}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Oversight Home ───────────────────────────────────────────────────────────

function OversightHome({ onNavigate, user }: Props & { user: CurrentUser }) {
  const { t } = useTranslation()
  const [viewAs, setViewAs] = useState<'oversight' | 'user'>('oversight')

  const { data: stats } = useProjectStats({})
  const { data: overdueTasks } = useOverdueTasks()
  const { data: blockedTasks } = useBlockedTasks()
  const { data: activeProjects } = useProjectsList({ status: 'active', sortBy: 'newest' })
  const { data: riskSummary } = useRiskSummary()

  if (viewAs === 'user') {
    return (
      <div className="view">
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="btn-submit"
            onClick={() => setViewAs('oversight')}
          >
            ← {t('homeOversightTitle')}
          </button>
        </div>
        <UserHome onNavigate={onNavigate} user={user} />
      </div>
    )
  }

  const activeCount = stats?.byStatus.find(s => s.status === 'active')?.n ?? 0
  const overdueCount = overdueTasks?.length ?? 0
  const blockedCount = blockedTasks?.length ?? 0

  return (
    <div className="view">
      <div className="home-hero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 className="home-hero-title">{t('homeOversightTitle')}</h1>
        </div>
        <button className="btn-submit" style={{ flexShrink: 0 }} onClick={() => setViewAs('user')}>
          {t('homeOversightSwitch')}
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card kpi-card--navy">
          <p className="kpi-value">{stats?.total ?? '—'}</p>
          <p className="kpi-label">{t('statTotal')}</p>
        </div>
        <div className="kpi-card kpi-card--orange">
          <p className="kpi-value">{activeCount}</p>
          <p className="kpi-label">{t('statActive')}</p>
        </div>
        <div className="kpi-card kpi-card--blue" style={{ background: overdueCount > 0 ? 'rgba(220,53,69,0.18)' : undefined }}>
          <p className="kpi-value" style={{ color: overdueCount > 0 ? '#f87171' : undefined }}>{overdueCount}</p>
          <p className="kpi-label">{t('homeColOverdue')}</p>
        </div>
        <div className="kpi-card kpi-card--green" style={{ background: blockedCount > 0 ? 'rgba(234,179,8,0.15)' : undefined }}>
          <p className="kpi-value" style={{ color: blockedCount > 0 ? '#facc15' : undefined }}>{blockedCount}</p>
          <p className="kpi-label">{t('homeColBlocked')}</p>
        </div>
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <p className="home-section-title">{t('homeRecentProjects')}</p>
        {!activeProjects || activeProjects.length === 0 ? (
          <p className="muted">{t('homeNoRecentProjects')}</p>
        ) : (
          <table className="oversight-risk-table">
            <thead>
              <tr>
                <th>{t('colRef')}</th>
                <th>{t('colName')}</th>
                <th>{t('colPM')}</th>
                <th>{t('colBudget')}</th>
                <th>{t('homeColOverdue')}</th>
                <th>{t('homeColBlocked')}</th>
              </tr>
            </thead>
            <tbody>
              {activeProjects.map(proj => {
                const risk = riskSummary?.[proj.id] ?? { overdueCount: 0, blockedCount: 0 }
                return (
                  <tr
                    key={proj.id}
                    onClick={() => onNavigate({ view: 'project', id: proj.id, name: proj.name })}
                  >
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.7 }}>{proj.refCode}</td>
                    <td style={{ fontWeight: 600 }}>{proj.name}</td>
                    <td style={{ opacity: 0.7 }}>{proj.projectManager || '—'}</td>
                    <td style={{ opacity: 0.7 }}>
                      {proj.budget != null && proj.currency === 'EUR' ? fmt(proj.budget) : '—'}
                    </td>
                    <td>
                      <span className={`risk-badge ${risk.overdueCount > 0 ? 'risk-badge--overdue' : 'risk-badge--zero'}`}>
                        {risk.overdueCount}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-badge ${risk.blockedCount > 0 ? 'risk-badge--blocked' : 'risk-badge--zero'}`}>
                        {risk.blockedCount}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <section>
          <p className="home-section-title">{t('reportsOverdueTitle')}</p>
          <div className="home-project-list">
            {!overdueTasks || overdueTasks.length === 0 ? (
              <p className="muted">{t('reportsOverdueEmpty')}</p>
            ) : overdueTasks.map(task => (
              <button
                key={task.id}
                className="home-alert-row home-alert-row--danger"
                onClick={() => onNavigate({ view: 'task', id: task.id, projectId: task.projectId })}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-lt)' }}>{task.projectName}</p>
                </div>
                {task.dueDate && <span style={{ fontSize: '12px', color: 'var(--red)', flexShrink: 0 }}>{task.dueDate}</span>}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="home-section-title">{t('reportsBlockedTitle')}</p>
          <div className="home-project-list">
            {!blockedTasks || blockedTasks.length === 0 ? (
              <p className="muted">{t('reportsBlockedEmpty')}</p>
            ) : blockedTasks.map(task => (
              <button
                key={task.id}
                className="home-alert-row home-alert-row--warning"
                onClick={() => onNavigate({ view: 'task', id: task.id, projectId: task.projectId })}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-lt)' }}>{task.projectName}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
