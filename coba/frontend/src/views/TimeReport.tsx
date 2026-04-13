import { useTranslation } from '../i18n/context'
import { useTimeReport } from '../api/timeEntries'

export default function TimeReport() {
  const { t } = useTranslation()
  const { data, isLoading } = useTimeReport()

  if (isLoading) {
    return (
      <div className="view">
        <div className="time-report-hero">
          <div>
            <h1 className="time-report-hero-title">{t('timeReportTitle')}</h1>
            <p className="time-report-hero-sub">{t('timeReportSubtitle')}</p>
          </div>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card time-report-kpi-skeleton" />
          <div className="kpi-card time-report-kpi-skeleton" />
          <div className="kpi-card time-report-kpi-skeleton" />
        </div>
        <p className="muted">{t('loading')}</p>
      </div>
    )
  }

  const totalHours = data?.byProject.reduce((s, r) => s + r.totalHours, 0) ?? 0
  const projectsWithEntries = data?.byProject.length ?? 0
  const membersWithEntries = data?.byMember.length ?? 0
  const underreportingCount = data?.underreporting.length ?? 0

  return (
    <div className="view">
      {/* ── Hero header ── */}
      <div className="time-report-hero">
        <div>
          <h1 className="time-report-hero-title">{t('timeReportTitle')}</h1>
          <p className="time-report-hero-sub">{t('timeReportSubtitle')}</p>
        </div>
        {underreportingCount > 0 && (
          <div className="time-report-alert-chip">
            <span className="time-report-alert-dot" />
            {underreportingCount} {t('timeReportUnderreporting')}
          </div>
        )}
      </div>

      {/* ── KPI summary row ── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KpiCard
          label={t('timeReportTotalHours')}
          value={totalHours.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}
          accent="blue"
          unit="h"
        />
        <KpiCard
          label={t('timeReportProjectCount')}
          value={String(projectsWithEntries)}
          accent="navy"
        />
        <KpiCard
          label={t('timeReportActiveMembers')}
          value={String(membersWithEntries)}
          accent="green"
        />
      </div>

      {/* ── Hours by project ── */}
      <section className="time-report-section">
        <div className="time-report-section-header">
          <h2 className="time-report-section-title">{t('timeReportByProject')}</h2>
          {data?.byProject.length ? (
            <span className="time-report-section-count">{data.byProject.length}</span>
          ) : null}
        </div>
        {!data?.byProject.length ? (
          <div className="time-report-empty">
            <span className="time-report-empty-icon">📋</span>
            <p>{t('timeReportNoData')}</p>
          </div>
        ) : (
          <div className="time-report-table-wrap">
            <table className="time-report-table">
              <thead>
                <tr>
                  <th>{t('colName')}</th>
                  <th className="time-report-col-num">{t('timeHours')}</th>
                  <th className="time-report-col-num">{t('colCount')}</th>
                  <th className="time-report-col-num">{t('detailTeamSize')}</th>
                  <th className="time-report-col-bar" />
                </tr>
              </thead>
              <tbody>
                {data.byProject.map(row => {
                  const pct = totalHours > 0 ? (row.totalHours / totalHours) * 100 : 0
                  return (
                    <tr key={row.projectId} className="time-report-row">
                      <td className="time-report-name">{row.projectName}</td>
                      <td className="time-report-col-num time-report-hours">
                        {row.totalHours.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}
                        <span className="time-report-unit">h</span>
                      </td>
                      <td className="time-report-col-num time-report-count">{row.entryCount}</td>
                      <td className="time-report-col-num time-report-count">{row.memberCount}</td>
                      <td className="time-report-col-bar">
                        <div className="time-report-bar">
                          <div className="time-report-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Hours by member ── */}
      <section className="time-report-section">
        <div className="time-report-section-header">
          <h2 className="time-report-section-title">{t('timeReportByMember')}</h2>
          {data?.byMember.length ? (
            <span className="time-report-section-count">{data.byMember.length}</span>
          ) : null}
        </div>
        {!data?.byMember.length ? (
          <div className="time-report-empty">
            <span className="time-report-empty-icon">👤</span>
            <p>{t('timeReportNoData')}</p>
          </div>
        ) : (
          <div className="time-report-table-wrap">
            <table className="time-report-table">
              <thead>
                <tr>
                  <th>{t('colName')}</th>
                  <th className="time-report-col-num">{t('timeHours')}</th>
                  <th className="time-report-col-num">{t('timeProject')}</th>
                  <th className="time-report-col-num">{t('colCount')}</th>
                  <th className="time-report-col-bar" />
                </tr>
              </thead>
              <tbody>
                {data.byMember.map(row => {
                  const pct = totalHours > 0 ? (row.totalHours / totalHours) * 100 : 0
                  return (
                    <tr key={row.memberId} className="time-report-row">
                      <td className="time-report-name">{row.memberName}</td>
                      <td className="time-report-col-num time-report-hours">
                        {row.totalHours.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}
                        <span className="time-report-unit">h</span>
                      </td>
                      <td className="time-report-col-num time-report-count">{row.projectCount}</td>
                      <td className="time-report-col-num time-report-count">{row.entryCount}</td>
                      <td className="time-report-col-bar">
                        <div className="time-report-bar">
                          <div className="time-report-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Underreporting alert ── */}
      <section className="time-report-section time-report-section--warning">
        <div className="time-report-section-header">
          <h2 className="time-report-section-title time-report-section-title--warning">
            {t('timeReportUnderreporting')}
          </h2>
          {data?.underreporting.length ? (
            <span className="time-report-section-count time-report-section-count--warning">
              {data.underreporting.length}
            </span>
          ) : null}
        </div>
        <p className="time-report-warning-desc">{t('timeReportUnderreportingDesc')}</p>

        {!data?.underreporting.length ? (
          <div className="time-report-empty time-report-empty--ok">
            <span className="time-report-empty-icon">✓</span>
            <p>{t('timeReportAllClear')}</p>
          </div>
        ) : (
          <ul className="time-report-underreporting-list">
            {data.underreporting.map(row => (
              <li key={row.memberId} className="time-report-underreporting-item">
                <div className="time-report-underreporting-left">
                  <span className="time-report-underreporting-icon">⚠</span>
                  <span className="time-report-underreporting-name">{row.memberName}</span>
                </div>
                <span className="time-report-underreporting-count">
                  {row.projectCount} {row.projectCount === 1 ? t('timeProject') : t('navSearch')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function KpiCard({ label, value, accent, unit }: { label: string; value: string; accent: string; unit?: string }) {
  return (
    <div className={`kpi-card kpi-card--${accent}`}>
      <p className="kpi-value">
        {value}
        {unit && <span style={{ fontSize: '16px', fontWeight: 600, marginLeft: '2px', opacity: 0.6 }}>{unit}</span>}
      </p>
      <p className="kpi-label">{label}</p>
    </div>
  )
}
