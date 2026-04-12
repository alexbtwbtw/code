import { useTranslation } from '../i18n/context'
import { useTimeReport } from '../api/timeEntries'

export default function TimeReport() {
  const { t } = useTranslation()
  const { data, isLoading } = useTimeReport()

  if (isLoading) return <div className="view"><p className="muted">{t('loading')}</p></div>

  const totalHours = data?.byProject.reduce((s, r) => s + r.totalHours, 0) ?? 0
  const activeMembers = data?.byMember.length ?? 0
  const underreportingCount = data?.underreporting.length ?? 0

  return (
    <div className="view">
      <div className="view-header">
        <h1>{t('timeReportTitle')}</h1>
      </div>

      {/* ── Summary cards ── */}
      <div className="kpi-grid">
        <KpiCard label={t('timeReportTotalHours')} value={totalHours.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} accent="blue" />
        <KpiCard label={t('timeReportActiveMembers')} value={String(activeMembers)} accent="green" />
        <KpiCard label={t('timeReportUnderreporting')} value={String(underreportingCount)} accent="orange" />
      </div>

      {/* ── Hours by project ── */}
      <section className="report-overdue-section">
        <h2 className="report-overdue-title">{t('timeReportByProject')}</h2>
        {!data?.byProject.length ? (
          <p className="muted">{t('timeReportNoData')}</p>
        ) : (
          <div className="priority-list-table-wrap">
            <table className="priority-list-table">
              <thead>
                <tr>
                  <th>{t('colName')}</th>
                  <th style={{ textAlign: 'right' }}>{t('timeHours')}</th>
                  <th style={{ textAlign: 'right' }}>{t('colCount')}</th>
                  <th style={{ textAlign: 'right' }}>{t('detailTeamSize')}</th>
                </tr>
              </thead>
              <tbody>
                {data.byProject.map(row => (
                  <tr key={row.projectId} className="priority-list-row">
                    <td className="priority-list-name">{row.projectName}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {row.totalHours.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.entryCount}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.memberCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Hours by member ── */}
      <section className="report-overdue-section">
        <h2 className="report-overdue-title">{t('timeReportByMember')}</h2>
        {!data?.byMember.length ? (
          <p className="muted">{t('timeReportNoData')}</p>
        ) : (
          <div className="priority-list-table-wrap">
            <table className="priority-list-table">
              <thead>
                <tr>
                  <th>{t('colName')}</th>
                  <th style={{ textAlign: 'right' }}>{t('timeHours')}</th>
                  <th style={{ textAlign: 'right' }}>{t('timeProject')}</th>
                  <th style={{ textAlign: 'right' }}>{t('colCount')}</th>
                </tr>
              </thead>
              <tbody>
                {data.byMember.map(row => (
                  <tr key={row.memberId} className="priority-list-row">
                    <td className="priority-list-name">{row.memberName}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {row.totalHours.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.projectCount}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.entryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Underreporting alert ── */}
      <section className="report-overdue-section">
        <h2 className="report-overdue-title" style={{ color: '#f5c842' }}>{t('timeReportUnderreporting')}</h2>
        {!data?.underreporting.length ? (
          <p className="muted" style={{ color: '#6bbf7a' }}>&#10003; {t('timeReportNoData').replace('No time entries yet.', 'All assigned members have logged time.').replace('Sem registos de tempo.', 'Todos os membros registaram tempo.')}</p>
        ) : (
          <ul className="time-report-underreporting-list">
            {data.underreporting.map(row => (
              <li key={row.memberId} className="time-report-underreporting-item">
                <span className="time-report-underreporting-name">{row.memberName}</span>
                <span className="time-report-underreporting-count">
                  {row.projectCount} {row.projectCount === 1 ? 'project' : 'projects'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
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
