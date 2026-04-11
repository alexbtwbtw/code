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
      {/* Hero */}
      <div className="view-header" style={{ paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--accent)' }}>COBA</span>
          <span style={{ width: 2, height: 40, background: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--fg)', opacity: 0.85 }}>Portal</span>
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('homeTagline')}</h1>
        <p className="view-sub">{t('homeDescription')}</p>
      </div>

      {/* Quick stats row */}
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>
        {/* Recent active projects */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
            {user ? t('homeMyProjects') : t('homeRecentProjects')}
          </h2>
          {recentProjects.length === 0 ? (
            <p className="muted">{t('homeNoRecentProjects')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentProjects.map(proj => (
                <button
                  key={proj.id}
                  className="result-row"
                  style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                  onClick={() => onNavigate({ view: 'project', id: proj.id, name: proj.name })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.85rem 1rem', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.75rem', opacity: 0.55, fontFamily: 'monospace' }}>{proj.refCode}</span>
                        {proj.country && <span style={{ fontSize: '0.7rem', opacity: 0.45 }}>· {proj.country}</span>}
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.name}</p>
                      {proj.client && <p style={{ margin: '0.1rem 0 0', fontSize: '0.8rem', opacity: 0.55 }}>{proj.client}</p>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                      <span className={`status-pill status-pill--${proj.status}`}>{t('statusActive')}</span>
                      {proj.budget != null && proj.currency === 'EUR' && (
                        <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>{fmt(proj.budget)}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Right column: urgent tasks + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 220 }}>
          {/* Urgent tasks panel */}
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
              {t('homeUrgentTasks')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 1rem', borderRadius: 8, background: overdueCount > 0 ? 'rgba(220,53,69,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${overdueCount > 0 ? 'rgba(220,53,69,0.35)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit', width: '100%' }}
                onClick={() => onNavigate({ view: 'reports' })}
              >
                <span style={{ fontSize: '0.88rem' }}>{t('homeOverdueTasks')}</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: overdueCount > 0 ? '#f66' : 'inherit' }}>{overdueCount}</span>
              </button>
              <button
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 1rem', borderRadius: 8, background: nearDeadlineCount > 0 ? 'rgba(255,193,7,0.10)' : 'rgba(255,255,255,0.04)', border: `1px solid ${nearDeadlineCount > 0 ? 'rgba(255,193,7,0.30)' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit', width: '100%' }}
                onClick={() => onNavigate({ view: 'reports' })}
              >
                <span style={{ fontSize: '0.88rem' }}>{t('homeNearDeadlineTasks')}</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: nearDeadlineCount > 0 ? '#ffc107' : 'inherit' }}>{nearDeadlineCount}</span>
              </button>
            </div>
          </section>

          {/* Quick actions */}
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
              {t('homeQuickActions')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                className="btn-submit"
                style={{ width: '100%' }}
                onClick={() => onNavigate({ view: 'search' })}
              >
                {t('homeBtnViewProjects')}
              </button>
              <button
                className="btn-submit"
                style={{ width: '100%' }}
                onClick={() => onNavigate({ view: 'add' })}
              >
                {t('homeBtnAddProject')}
              </button>
              <button
                className="btn-submit"
                style={{ width: '100%' }}
                onClick={() => onNavigate({ view: 'team' })}
              >
                {t('homeBtnViewTeam')}
              </button>
              <button
                className="btn-submit"
                style={{ width: '100%' }}
                onClick={() => onNavigate({ view: 'reports' })}
              >
                {t('homeBtnViewReports')}
              </button>
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
      {/* Hero */}
      <div className="view-header" style={{ paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--accent)' }}>COBA</span>
              <span style={{ width: 2, height: 40, background: 'rgba(255,255,255,0.2)', borderRadius: 1 }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 600, opacity: 0.85 }}>Portal</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('homeOversightTitle')}</h1>
          </div>
          <button
            className="btn-submit"
            style={{ flexShrink: 0 }}
            onClick={() => setViewAs('user')}
          >
            {t('homeOversightSwitch')}
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
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

      {/* Active projects risk table */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
          {t('homeRecentProjects')}
        </h2>
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

      {/* Risk highlights: overdue + blocked tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Overdue tasks */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
            {t('reportsOverdueTitle')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {!overdueTasks || overdueTasks.length === 0 ? (
              <p className="muted">{t('reportsOverdueEmpty')}</p>
            ) : overdueTasks.map(task => (
              <button
                key={task.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(220,53,69,0.10)', border: '1px solid rgba(220,53,69,0.25)', cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit', width: '100%' }}
                onClick={() => onNavigate({ view: 'task', id: task.id, projectId: task.projectId })}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', opacity: 0.55 }}>{task.projectName}</p>
                </div>
                {task.dueDate && (
                  <span style={{ fontSize: '0.75rem', opacity: 0.6, flexShrink: 0 }}>{t('taskDue')}: {task.dueDate}</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Blocked tasks */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
            {t('reportsBlockedTitle')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {!blockedTasks || blockedTasks.length === 0 ? (
              <p className="muted">{t('reportsBlockedEmpty')}</p>
            ) : blockedTasks.map(task => (
              <button
                key={task.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.25)', cursor: 'pointer', textAlign: 'left', color: 'inherit', font: 'inherit', width: '100%' }}
                onClick={() => onNavigate({ view: 'task', id: task.id, projectId: task.projectId })}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', opacity: 0.55 }}>{task.projectName}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
