import { useClaimStats, useRecentClaims } from '../api/claims'
import { useUpcomingInspections } from '../api/inspections'
import { CLAIM_STATUSES } from '@backend/schemas/claims'
import type { Page } from '../App'

interface Props {
  onNavigate: (p: Page) => void
}

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

const OPEN_STATUSES = new Set([
  'new', 'assigned', 'inspection_scheduled', 'inspected', 'report_pending', 'submitted',
])

const STATUS_LABELS: Record<string, string> = {
  new:                  'Novo',
  assigned:             'Atribuído',
  inspection_scheduled: 'Vistoria Agendada',
  inspected:            'Vistoria Concluída',
  report_pending:       'Relatório Pendente',
  submitted:            'Relatório Enviado',
  closed:               'Encerrado',
  disputed:             'Contestado',
}

function formatLabel(s: string): string {
  return STATUS_LABELS[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} M€`
  }
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function Dashboard({ onNavigate }: Props) {
  const stats = useClaimStats()
  const recent = useRecentClaims(5)
  const inspections = useUpcomingInspections(5)

  const isLoading = stats.isLoading || recent.isLoading || inspections.isLoading

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <span className="spinner spinner-lg" />
      </div>
    )
  }

  const s = stats.data
  const openCount = s
    ? Object.entries(s.byStatus)
        .filter(([status]) => OPEN_STATUSES.has(status))
        .reduce((sum, [, count]) => sum + count, 0)
    : 0

  return (
    <div className="page">
      <div className="page-header">
        <h1>Painel</h1>
      </div>

      {/* ── Stats row ── */}
      <div className="section">
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <div className="stat-card">
            <div className="stat-card-value">{s ? String(s.total) : '—'}</div>
            <div className="stat-card-label">Total de Sinistros</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{String(openCount)}</div>
            <div className="stat-card-label">Sinistros Abertos</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{s && s.totalEstimatedValue ? formatCurrency(s.totalEstimatedValue) : '—'}</div>
            <div className="stat-card-label">Valor Total Estimado</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{s && s.avgDaysToClose ? `${s.avgDaysToClose.toFixed(1)} dias` : '—'}</div>
            <div className="stat-card-label">Média de Dias p/ Encerramento</div>
          </div>
        </div>
      </div>

      {/* ── Status breakdown ── */}
      <div className="section">
        <div className="section-title">Distribuição por Status</div>
        <div className="card">
          {stats.error && (
            <p style={{ color: 'var(--danger)' }}>{stats.error.message}</p>
          )}
          {s && CLAIM_STATUSES.filter(status => (s.byStatus[status] ?? 0) > 0).map(status => {
            const count = s.byStatus[status] ?? 0
            const pct = s.total > 0 ? (count / s.total) * 100 : 0
            const color = STATUS_COLORS[status] ?? '#94a3b8'
            return (
              <div key={status} style={{ marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {formatLabel(status)}
                  </span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color }}>
                    {count}
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{ height: '6px', borderRadius: '3px', background: color, width: `${pct}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )
          })}
          {s && Object.values(s.byStatus).every(v => v === 0) && (
            <div className="empty-state"><p>Nenhum sinistro cadastrado.</p></div>
          )}
        </div>
      </div>

      {/* ── Recent Claims ── */}
      <div className="section">
        <div className="section-title">Sinistros Recentes</div>
        <div className="card card-flush">
          {recent.error && (
            <p style={{ color: 'var(--danger)', padding: '1rem' }}>{recent.error.message}</p>
          )}
          {recent.data && recent.data.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Sinistro Nº</th>
                  <th>Sinistrado</th>
                  <th>Status</th>
                  <th>Valor Est.</th>
                  <th>Data de Abertura</th>
                </tr>
              </thead>
              <tbody>
                {recent.data.map(claim => (
                  <tr key={claim.id}>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: 0, color: 'var(--accent)' }}
                        onClick={() => onNavigate({ view: 'claim', id: String(claim.id) })}
                      >
                        {claim.claimNumber}
                      </button>
                    </td>
                    <td>{claim.claimantName}</td>
                    <td>
                      <span className={`badge badge-${claim.status}`}>
                        {formatLabel(claim.status)}
                      </span>
                    </td>
                    <td>{claim.estimatedValue != null ? formatCurrency(claim.estimatedValue) : '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDate(claim.dateOpened)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><p>Nenhum sinistro cadastrado.</p></div>
          )}
          <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--accent)' }}
              onClick={() => onNavigate({ view: 'claims' })}
            >
              Ver todos os sinistros →
            </button>
          </div>
        </div>
      </div>

      {/* ── Upcoming Inspections ── */}
      <div className="section">
        <div className="section-title">Próximas Vistorias</div>
        {inspections.error && (
          <p style={{ color: 'var(--danger)' }}>{inspections.error.message}</p>
        )}
        {inspections.data && inspections.data.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {inspections.data.map(insp => (
              <div key={insp.id} className="card" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {insp.scheduledDate ? formatDate(insp.scheduledDate) : 'A definir'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Sinistro Nº{insp.claimId}
                    </div>
                    {insp.findings && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {insp.findings.length > 120 ? insp.findings.slice(0, 120) + '…' : insp.findings}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state"><p>Nenhuma vistoria agendada.</p></div>
        )}
      </div>
    </div>
  )
}

