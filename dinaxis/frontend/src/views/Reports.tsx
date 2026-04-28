import { useClaimStats, useClaimsList } from '../api/claims'
import { useInsurersList } from '../api/insurers'
import { CLAIM_STATUSES, CLAIM_TYPES } from '@backend/schemas/claims'
import type { Page } from '../App'

interface Props {
  onNavigate: (p: Page) => void
}

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  new:                  '#94a3b8',
  assigned:             '#60a5fa',
  inspection_scheduled: '#a78bfa',
  inspected:            '#818cf8',
  report_pending:       '#fbbf24',
  submitted:            '#fb923c',
  closed:               '#34d399',
  disputed:             '#f87171',
}

const PT_LABELS: Record<string, string> = {
  new:                  'Novo',
  assigned:             'Atribuído',
  inspection_scheduled: 'Vistoria Agendada',
  inspected:            'Vistoria Concluída',
  report_pending:       'Relatório Pendente',
  submitted:            'Relatório Enviado',
  closed:               'Encerrado',
  disputed:             'Contestado',
}

const TYPE_COLORS: Record<string, string> = {
  property_damage: '#64748b',
  liability:       '#f59e0b',
  auto:            '#22c55e',
  flood:           '#3b82f6',
  fire:            '#ef4444',
  theft:           '#8b5cf6',
  other:           '#94a3b8',
}

const TYPE_LABELS: Record<string, string> = {
  property_damage: 'Dano à Propriedade',
  liability:       'Responsabilidade Civil',
  auto:            'Automóvel',
  flood:           'Inundação',
  fire:            'Incêndio',
  theft:           'Furto/Roubo',
  other:           'Outro',
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface HorizBarChartProps {
  items: { key: string; label: string; count: number; color: string }[]
  total: number
}

function HorizBarChart({ items, total }: HorizBarChartProps) {
  const visible = items.filter(i => i.count > 0)
  if (visible.length === 0) {
    return <div className="empty-state"><p>Nenhum dado disponível.</p></div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {visible.map(({ key, label, count, color }) => {
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color }}>{count}</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ height: '6px', borderRadius: '3px', background: color, width: `${pct}%`, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Reports({ onNavigate: _ }: Props) {
  const statsQuery   = useClaimStats()
  const claimsNewest = useClaimsList({ sortBy: 'newest' })
  const claimsOldest = useClaimsList({ sortBy: 'oldest' })
  const insurersQuery = useInsurersList()

  const isLoading =
    statsQuery.isLoading ||
    claimsNewest.isLoading ||
    claimsOldest.isLoading ||
    insurersQuery.isLoading

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <span className="spinner spinner-lg" />
      </div>
    )
  }

  const stats   = statsQuery.data
  const claims  = claimsNewest.data ?? []
  const claimsAsc = claimsOldest.data ?? []
  const insurers = insurersQuery.data ?? []

  // ── Section 3: per-insurer aggregation ──────────────────────────────────
  const insurerClaimCounts: Record<number, number> = {}
  const insurerEstimatedValues: Record<number, number> = {}
  const insurerClosedCounts: Record<number, number> = {}

  for (const claim of claims) {
    if (claim.insurerId == null) continue
    const id = claim.insurerId
    insurerClaimCounts[id] = (insurerClaimCounts[id] ?? 0) + 1
    insurerEstimatedValues[id] = (insurerEstimatedValues[id] ?? 0) + (claim.estimatedValue ?? 0)
    if (claim.status === 'closed') {
      insurerClosedCounts[id] = (insurerClosedCounts[id] ?? 0) + 1
    }
  }

  const insurerRows = insurers
    .map(ins => ({
      id:            ins.id,
      name:          ins.name,
      claimCount:    insurerClaimCounts[ins.id] ?? 0,
      estimatedValue: insurerEstimatedValues[ins.id] ?? 0,
      closedCount:   insurerClosedCounts[ins.id] ?? 0,
    }))
    .filter(r => r.claimCount > 0)
    .sort((a, b) => b.claimCount - a.claimCount)

  const maxInsurerClaims = Math.max(...insurerRows.map(r => r.claimCount), 1)

  // ── Section 4: monthly trend (last 12 months) ────────────────────────────
  const now = new Date()
  const last12: string[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    last12.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthlyCounts: Record<string, number> = {}
  for (const ym of last12) monthlyCounts[ym] = 0
  for (const claim of claimsAsc) {
    const ym = claim.dateOpened.slice(0, 7)
    if (ym in monthlyCounts) monthlyCounts[ym]++
  }

  const monthlyData = last12.map(ym => {
    const [, monthStr] = ym.split('-')
    const monthIndex = parseInt(monthStr, 10) - 1
    return { ym, label: MONTHS_PT[monthIndex] ?? ym, count: monthlyCounts[ym] }
  })

  const maxMonthCount = Math.max(...monthlyData.map(m => m.count), 1)

  // SVG bar chart dimensions
  const svgW = 600
  const svgH = 160
  const padL = 10
  const padR = 10
  const padTop = 24   // space for count labels above bars
  const padBot = 24   // space for month labels below bars
  const chartH = svgH - padTop - padBot
  const barCount = monthlyData.length
  const totalBarW = svgW - padL - padR
  const barW = totalBarW / barCount

  // ── Status bar chart items ───────────────────────────────────────────────
  const statusItems = CLAIM_STATUSES.map(s => ({
    key:   s,
    label: PT_LABELS[s] ?? s,
    count: stats?.byStatus[s] ?? 0,
    color: STATUS_COLORS[s] ?? '#94a3b8',
  }))

  // ── Type bar chart items ─────────────────────────────────────────────────
  const typeItems = CLAIM_TYPES.map(t => ({
    key:   t,
    label: TYPE_LABELS[t] ?? t,
    count: stats?.byType[t] ?? 0,
    color: TYPE_COLORS[t] ?? '#94a3b8',
  }))

  return (
    <div className="page">
      <div className="page-header">
        <h1>Relatórios</h1>
      </div>

      {/* ── Section 1: KPI row ── */}
      <div className="section">
        <div className="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
          <div className="stat-card">
            <div className="stat-card-value">{stats ? String(stats.total) : '—'}</div>
            <div className="stat-card-label">Total de Sinistros</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">
              {stats?.totalEstimatedValue ? formatCurrency(stats.totalEstimatedValue) : '—'}
            </div>
            <div className="stat-card-label">Valor Total Estimado</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">
              {stats?.totalFinalSettlement ? formatCurrency(stats.totalFinalSettlement) : '—'}
            </div>
            <div className="stat-card-label">Valor Total de Acordos</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">
              {stats?.avgDaysToClose ? `${stats.avgDaysToClose.toFixed(0)} dias` : '—'}
            </div>
            <div className="stat-card-label">Tempo Médio de Encerramento</div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Distribution by Status + Type ── */}
      <div className="section">
        <div className="grid-2">
          {/* Status distribution */}
          <div>
            <div className="section-title">Distribuição por Status</div>
            <div className="card">
              <HorizBarChart items={statusItems} total={stats?.total ?? 0} />
            </div>
          </div>

          {/* Type distribution */}
          <div>
            <div className="section-title">Distribuição por Tipo</div>
            <div className="card">
              <HorizBarChart items={typeItems} total={stats?.total ?? 0} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Claims by Insurer ── */}
      <div className="section">
        <div className="section-title">Sinistros por Seguradora</div>
        <div className="card card-flush">
          {insurerRows.length === 0 ? (
            <div className="empty-state"><p>Nenhum sinistro vinculado a seguradora.</p></div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Seguradora</th>
                  <th>Sinistros</th>
                  <th>Valor Estimado Total</th>
                  <th>Taxa de Encerramento</th>
                  <th style={{ width: '30%' }}></th>
                </tr>
              </thead>
              <tbody>
                {insurerRows.map(row => {
                  const closureRate = row.claimCount > 0
                    ? Math.round((row.closedCount / row.claimCount) * 100)
                    : 0
                  const barPct = (row.claimCount / maxInsurerClaims) * 100
                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 500 }}>{row.name}</td>
                      <td>{row.claimCount}</td>
                      <td>{row.estimatedValue > 0 ? formatCurrency(row.estimatedValue) : '—'}</td>
                      <td>
                        <span style={{ color: closureRate >= 50 ? '#34d399' : 'var(--text-muted)', fontWeight: 600 }}>
                          {closureRate}%
                        </span>
                      </td>
                      <td>
                        <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-2)', overflow: 'hidden' }}>
                          <div style={{ height: '6px', borderRadius: '3px', background: 'var(--accent)', width: `${barPct}%`, transition: 'width 0.4s ease' }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Section 4: Monthly trend ── */}
      <div className="section">
        <div className="section-title">Evolução Mensal (últimos 12 meses)</div>
        <div className="card">
          {claimsAsc.length === 0 ? (
            <div className="empty-state"><p>Nenhum sinistro disponível para o período.</p></div>
          ) : (
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              preserveAspectRatio="none"
              style={{ width: '100%', height: '160px', display: 'block' }}
              aria-label="Evolução mensal de sinistros"
            >
              {monthlyData.map((m, i) => {
                const barH = maxMonthCount > 0 ? (m.count / maxMonthCount) * chartH : 0
                const x = padL + i * barW
                const barX = x + barW * 0.15
                const barActualW = barW * 0.7
                const barY = padTop + chartH - barH
                const labelX = x + barW / 2
                return (
                  <g key={m.ym}>
                    {/* Bar */}
                    {m.count > 0 && (
                      <rect
                        x={barX}
                        y={barY}
                        width={barActualW}
                        height={barH}
                        rx={2}
                        fill="var(--accent)"
                        opacity={0.85}
                      />
                    )}
                    {/* Count above bar */}
                    {m.count > 0 && (
                      <text
                        x={labelX}
                        y={barY - 4}
                        textAnchor="middle"
                        fontSize={10}
                        fill="var(--text)"
                        fontWeight={600}
                      >
                        {m.count}
                      </text>
                    )}
                    {/* Month label */}
                    <text
                      x={labelX}
                      y={svgH - 4}
                      textAnchor="middle"
                      fontSize={9}
                      fill="var(--text-muted)"
                    >
                      {m.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}
