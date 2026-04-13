import { useState, useMemo } from 'react'
import { useTranslation } from '../i18n/context'
import { useCurrentUser } from '../auth'
import { useCompanyFinancials } from '../api/finance'

// ── Helpers ───────────────────────────────────────────────────────────────────

function currentYearRange() {
  const y = new Date().getFullYear()
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

function fmt(n: number) {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtEur(n: number) {
  return `€ ${fmt(n)}`
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string
  value: string
  accent: 'blue' | 'green' | 'navy' | 'orange' | 'red'
  sub?: string
}) {
  return (
    <div className={`kpi-card kpi-card--${accent}`}>
      <p className="kpi-value">{value}</p>
      <p className="kpi-label">{label}</p>
      {sub && <p className="finance-report-kpi-sub">{sub}</p>}
    </div>
  )
}

// ── Budget utilisation bar ───────────────────────────────────────────────────

function BudgetBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const over = pct > 100
  return (
    <div className="finance-report-budget-bar">
      <div
        className={`finance-report-budget-bar-fill${over ? ' finance-report-budget-bar-fill--over' : ''}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

// ── Category label map ────────────────────────────────────────────────────────

const CAT_KEYS: Record<string, string> = {
  materials:     'financeCatMaterials',
  subcontractor: 'financeCatSubcontractor',
  equipment:     'financeCatEquipment',
  travel:        'financeCatTravel',
  permits:       'financeCatPermits',
  survey:        'financeCatSurvey',
  software:      'financeCatSoftware',
  other:         'financeCatOther',
}

// ── Main view ─────────────────────────────────────────────────────────────────

type RangeMode = 'year' | 'all' | 'custom'

export default function FinancialReport() {
  const { t } = useTranslation()
  const { user } = useCurrentUser()
  const hasFinanceAccess = user?.role === 'finance' || user?.role === 'oversight'

  const [rangeMode, setRangeMode] = useState<RangeMode>('year')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]   = useState('')

  // Sorting state for the projects table
  const [sortCol, setSortCol] = useState<'name' | 'labor' | 'fixed' | 'total' | 'budget' | 'variance'>('total')
  const [sortAsc, setSortAsc] = useState(false)

  const yearRange = useMemo(() => currentYearRange(), [])

  const queryOpts = useMemo(() => {
    if (rangeMode === 'all') return undefined
    if (rangeMode === 'year') return { fromDate: yearRange.from, toDate: yearRange.to }
    const opts: { fromDate?: string; toDate?: string } = {}
    if (customFrom) opts.fromDate = customFrom
    if (customTo)   opts.toDate   = customTo
    return opts
  }, [rangeMode, yearRange, customFrom, customTo])

  const { data, isLoading } = useCompanyFinancials(queryOpts)

  // ── Sort projects ──────────────────────────────────────────────────────────

  const sortedProjects = useMemo(() => {
    if (!data?.byProject) return []
    const rows = [...data.byProject]
    rows.sort((a, b) => {
      let av = 0, bv = 0
      if (sortCol === 'name') {
        return sortAsc
          ? a.projectName.localeCompare(b.projectName)
          : b.projectName.localeCompare(a.projectName)
      }
      if (sortCol === 'labor')    { av = a.laborCost ?? 0;    bv = b.laborCost ?? 0 }
      if (sortCol === 'fixed')    { av = a.fixedCost ?? 0;    bv = b.fixedCost ?? 0 }
      if (sortCol === 'total')    { av = a.totalCost;          bv = b.totalCost }
      if (sortCol === 'budget')   { av = a.budget ?? 0;        bv = b.budget ?? 0 }
      if (sortCol === 'variance') { av = a.variancePct ?? 0;  bv = b.variancePct ?? 0 }
      return sortAsc ? av - bv : bv - av
    })
    return rows
  }, [data, sortCol, sortAsc])

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortAsc(v => !v)
    else { setSortCol(col); setSortAsc(false) }
  }

  function SortTh({ col, label }: { col: typeof sortCol; label: string }) {
    const active = sortCol === col
    return (
      <th
        className={`finance-report-th-sort${active ? ' finance-report-th-sort--active' : ''}`}
        onClick={() => toggleSort(col)}
      >
        {label}
        <span className="finance-report-sort-icon">{active ? (sortAsc ? ' ↑' : ' ↓') : ' ↕'}</span>
      </th>
    )
  }

  // ── Access guard ──────────────────────────────────────────────────────────

  if (!hasFinanceAccess) {
    return (
      <div className="view">
        <div className="finance-report-hero">
          <div>
            <h1 className="finance-report-hero-title">{t('financeReportTitle')}</h1>
          </div>
        </div>
        <div className="detail-section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔒</p>
          <p className="muted">{t('financeAccessDenied')}</p>
        </div>
      </div>
    )
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="view">
        <div className="finance-report-hero">
          <div>
            <h1 className="finance-report-hero-title">{t('financeReportTitle')}</h1>
            <p className="finance-report-hero-sub">{t('financeReportSubtitle')}</p>
          </div>
        </div>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[0, 1, 2, 3].map(i => <div key={i} className="kpi-card finance-report-kpi-skeleton" />)}
        </div>
        <p className="muted">{t('loading')}</p>
      </div>
    )
  }

  // ── Derived totals ─────────────────────────────────────────────────────────

  const totalLabor   = data?.totalLaborCost  ?? 0
  const totalFixed   = data?.totalFixedCost  ?? 0
  const totalSpend   = data?.totalCost       ?? 0
  const totalBudget  = data?.totalBudget     ?? 0
  const projectCount = data?.projectCount    ?? 0
  const byCategory   = data?.byCategory      ?? []
  const byMonth      = data?.byMonth         ?? []
  const maxCatSpend  = Math.max(1, ...byCategory.map(c => c.fixedCost))
  const maxMonthSpend= Math.max(1, ...byMonth.map(m => m.laborCost + m.fixedCost))

  const overallVariance    = totalBudget > 0 ? totalBudget - totalSpend : null
  const overallVariancePct = totalBudget > 0 ? ((totalSpend / totalBudget) * 100) : null

  return (
    <div className="view">
      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="finance-report-hero">
        <div>
          <h1 className="finance-report-hero-title">{t('financeReportTitle')}</h1>
          <p className="finance-report-hero-sub">{t('financeReportSubtitle')}</p>
        </div>
        <div className="finance-report-currency-note">EUR</div>
      </div>

      {/* ── Date range filter ────────────────────────────────────────────────── */}
      <div className="finance-report-filter-bar">
        <div className="finance-report-range-toggles">
          <button
            className={`finance-report-range-btn${rangeMode === 'year' ? ' finance-report-range-btn--active' : ''}`}
            onClick={() => setRangeMode('year')}
          >
            {t('financeThisYear')}
          </button>
          <button
            className={`finance-report-range-btn${rangeMode === 'all' ? ' finance-report-range-btn--active' : ''}`}
            onClick={() => setRangeMode('all')}
          >
            {t('financeAllTime')}
          </button>
          <button
            className={`finance-report-range-btn${rangeMode === 'custom' ? ' finance-report-range-btn--active' : ''}`}
            onClick={() => setRangeMode('custom')}
          >
            {t('financeCustomRange')}
          </button>
        </div>
        {rangeMode === 'custom' && (
          <div className="finance-report-custom-range">
            <input
              type="date"
              className="form-input finance-report-date-input"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
            />
            <span className="finance-report-date-sep">→</span>
            <input
              type="date"
              className="form-input finance-report-date-input"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard
          label={t('financeLaborCost')}
          value={fmtEur(totalLabor)}
          accent="blue"
        />
        <KpiCard
          label={t('financeFixedCosts')}
          value={fmtEur(totalFixed)}
          accent="navy"
        />
        <KpiCard
          label={t('financeTotalSpend')}
          value={fmtEur(totalSpend)}
          accent="orange"
        />
        <KpiCard
          label={t('financeProjectsWithData')}
          value={String(projectCount)}
          accent={overallVariance !== null && overallVariance < 0 ? 'red' : 'green'}
          sub={
            overallVariancePct !== null
              ? `${overallVariancePct.toFixed(1)}% ${t('financeBudgetUsed')}`
              : undefined
          }
        />
      </div>

      {/* ── Projects cost table ──────────────────────────────────────────────── */}
      <section className="finance-report-section">
        <div className="finance-report-section-header">
          <h2 className="finance-report-section-title">{t('financeByProject')}</h2>
          {sortedProjects.length > 0 && (
            <span className="finance-report-section-count">{sortedProjects.length}</span>
          )}
        </div>

        {sortedProjects.length === 0 ? (
          <div className="finance-report-empty">
            <p>{t('timeReportNoData')}</p>
          </div>
        ) : (
          <div className="finance-report-table-wrap">
            <table className="finance-report-table">
              <thead>
                <tr>
                  <SortTh col="name"     label={t('colName')} />
                  <SortTh col="labor"    label={t('financeLaborCost')} />
                  <SortTh col="fixed"    label={t('financeFixedCosts')} />
                  <SortTh col="total"    label={t('financeTotalSpend')} />
                  <SortTh col="budget"   label={t('financeBudget')} />
                  <SortTh col="variance" label={t('financeVariance')} />
                  <th className="finance-report-th-bar">{t('financeBudgetUsed')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map(row => {
                  const variance = row.budget != null ? row.budget - row.totalCost : null
                  const utilPct  = row.budget != null && row.budget > 0
                    ? (row.totalCost / row.budget) * 100
                    : null
                  const overBudget = variance != null && variance < 0

                  return (
                    <tr key={row.projectId} className="finance-report-row">
                      <td className="finance-report-name">{row.projectName}</td>
                      <td className="finance-report-col-num">
                        {fmtEur(row.laborCost ?? 0)}
                      </td>
                      <td className="finance-report-col-num">
                        {fmtEur(row.fixedCost ?? 0)}
                      </td>
                      <td className="finance-report-col-num finance-report-total">
                        {fmtEur(row.totalCost)}
                      </td>
                      <td className="finance-report-col-num finance-report-budget">
                        {row.budget != null ? fmtEur(row.budget) : <span className="finance-report-na">{t('na')}</span>}
                      </td>
                      <td className={`finance-report-col-num finance-report-variance${overBudget ? ' finance-report-variance--over' : variance != null ? ' finance-report-variance--under' : ''}`}>
                        {variance != null ? (
                          <>
                            {overBudget ? '−' : '+'}
                            {fmtEur(Math.abs(variance))}
                            {row.variancePct != null && (
                              <span className="finance-report-variance-pct">
                                {' '}({Math.abs(row.variancePct).toFixed(1)}%)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="finance-report-na">{t('na')}</span>
                        )}
                      </td>
                      <td className="finance-report-col-bar">
                        {utilPct != null ? (
                          <div className="finance-report-bar-wrap">
                            <BudgetBar pct={utilPct} />
                            <span className="finance-report-bar-pct">
                              {utilPct.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="finance-report-na">{t('na')}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="finance-report-footer">
                  <td className="finance-report-name">{t('financeTotalSpend')}</td>
                  <td className="finance-report-col-num">{fmtEur(totalLabor)}</td>
                  <td className="finance-report-col-num">{fmtEur(totalFixed)}</td>
                  <td className="finance-report-col-num finance-report-total">{fmtEur(totalSpend)}</td>
                  <td className="finance-report-col-num finance-report-budget">
                    {totalBudget > 0 ? fmtEur(totalBudget) : <span className="finance-report-na">{t('na')}</span>}
                  </td>
                  <td className={`finance-report-col-num finance-report-variance${overallVariance !== null && overallVariance < 0 ? ' finance-report-variance--over' : overallVariance !== null ? ' finance-report-variance--under' : ''}`}>
                    {overallVariance !== null ? (
                      <>
                        {overallVariance < 0 ? '−' : '+'}
                        {fmtEur(Math.abs(overallVariance))}
                      </>
                    ) : (
                      <span className="finance-report-na">{t('na')}</span>
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* ── Fixed costs by category ──────────────────────────────────────────── */}
      <section className="finance-report-section">
        <div className="finance-report-section-header">
          <h2 className="finance-report-section-title">{t('financeByCategory')}</h2>
        </div>

        {byCategory.length === 0 ? (
          <div className="finance-report-empty">
            <p>{t('timeReportNoData')}</p>
          </div>
        ) : (
          <div className="finance-report-cat-grid">
            {byCategory.map(cat => {
              const pct = (cat.fixedCost / maxCatSpend) * 100
              const labelKey = CAT_KEYS[cat.category] ?? 'financeCatOther'
              return (
                <div key={cat.category} className="finance-report-cat-row">
                  <div className="finance-report-cat-label">{t(labelKey as Parameters<typeof t>[0])}</div>
                  <div className="finance-report-cat-bar-wrap">
                    <div className="finance-report-cat-bar">
                      <div className="finance-report-cat-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="finance-report-cat-amount">{fmtEur(cat.fixedCost)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Monthly trend ───────────────────────────────────────────────────── */}
      <section className="finance-report-section">
        <div className="finance-report-section-header">
          <h2 className="finance-report-section-title">{t('financeByMonth')}</h2>
        </div>

        {byMonth.length === 0 ? (
          <div className="finance-report-empty">
            <p>{t('timeReportNoData')}</p>
          </div>
        ) : (
          <div className="finance-report-table-wrap">
            <table className="finance-report-table">
              <thead>
                <tr>
                  <th>{t('financeMonth')}</th>
                  <th className="finance-report-col-num">{t('financeLaborCost')}</th>
                  <th className="finance-report-col-num">{t('financeFixedCosts')}</th>
                  <th className="finance-report-col-num">{t('financeTotalSpend')}</th>
                  <th className="finance-report-th-bar" />
                </tr>
              </thead>
              <tbody>
                {byMonth.map(row => {
                  const rowTotal = row.laborCost + row.fixedCost
                  return (
                    <tr key={row.month} className="finance-report-row">
                      <td className="finance-report-name">{row.month}</td>
                      <td className="finance-report-col-num">{fmtEur(row.laborCost)}</td>
                      <td className="finance-report-col-num">{fmtEur(row.fixedCost)}</td>
                      <td className="finance-report-col-num finance-report-total">{fmtEur(rowTotal)}</td>
                      <td className="finance-report-col-bar">
                        <div className="finance-report-bar-wrap">
                          <div className="finance-report-month-bar">
                            <div
                              className="finance-report-month-bar-labor"
                              style={{ width: `${(row.laborCost / maxMonthSpend) * 100}%` }}
                            />
                            <div
                              className="finance-report-month-bar-fixed"
                              style={{ width: `${(row.fixedCost / maxMonthSpend) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        {byMonth.length > 0 && (
          <div className="finance-report-legend">
            <span className="finance-report-legend-item">
              <span className="finance-report-legend-dot finance-report-legend-dot--labor" />
              {t('financeLaborCost')}
            </span>
            <span className="finance-report-legend-item">
              <span className="finance-report-legend-dot finance-report-legend-dot--fixed" />
              {t('financeFixedCosts')}
            </span>
          </div>
        )}
      </section>
    </div>
  )
}
