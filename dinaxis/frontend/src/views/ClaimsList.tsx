import { useState } from 'react'
import type { Page } from '../App'
import { useClaimsList, useCreateClaim, useUpdateClaim, useCustomClaimTypes } from '../api/claims'
import { useInsurersList } from '../api/insurers'
import type { Claim, ClaimStatus, ClaimType } from '@backend/types/claims'
import { CLAIM_STATUSES, CLAIM_TYPES, PROPERTY_TYPES } from '@backend/schemas/claims'

const currency = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const PT_LABELS: Record<string, string> = {
  new: 'Novo', assigned: 'Atribuído', inspection_scheduled: 'Vistoria Agendada',
  inspected: 'Vistoria Concluída', report_pending: 'Relatório Pendente', submitted: 'Relatório Enviado',
  closed: 'Encerrado', disputed: 'Contestado',
  property_damage: 'Dano à Propriedade', liability: 'Responsabilidade Civil',
  auto: 'Automóvel', flood: 'Inundação', fire: 'Incêndio', theft: 'Furto/Roubo',
  residential: 'Residencial', commercial: 'Comercial', industrial: 'Industrial',
  other: 'Outro',
}
function formatLabel(s: string): string {
  if (s.startsWith('custom:')) return s.replace('custom:', '')
  return PT_LABELS[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatValue(v: number | null) {
  return v != null ? currency.format(v) : '—'
}

type SortBy = 'newest' | 'oldest' | 'value_desc' | 'value_asc'

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'value_desc', label: 'Maior valor' },
  { value: 'value_asc', label: 'Menor valor' },
]

interface NewClaimForm {
  claimNumber: string
  insurerId: string
  claimantName: string
  claimantEmail: string
  claimantPhone: string
  propertyAddress: string
  propertyType: string
  claimType: string
  customTypeName: string
  status: string
  dateOpened: string
  estimatedValue: string
  description: string
}

const defaultForm: NewClaimForm = {
  claimNumber: '',
  insurerId: '',
  claimantName: '',
  claimantEmail: '',
  claimantPhone: '',
  propertyAddress: '',
  propertyType: 'residential',
  claimType: 'property_damage',
  customTypeName: '',
  status: 'new',
  dateOpened: new Date().toISOString().slice(0, 10),
  estimatedValue: '',
  description: '',
}

export default function ClaimsList({ onNavigate, initialStatusFilter }: { onNavigate: (p: Page) => void; initialStatusFilter?: string }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? '')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<NewClaimForm>(defaultForm)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: claims, isLoading } = useClaimsList({
    search: search || undefined,
    status: (statusFilter || undefined) as ClaimStatus | undefined,
    claimType: (typeFilter || undefined) as ClaimType | undefined,
    sortBy,
  })

  const [pendingStatusIds, setPendingStatusIds] = useState<Set<number>>(new Set())

  const { data: insurers = [] } = useInsurersList()
  const { data: customTypes = [] } = useCustomClaimTypes()
  const createClaim = useCreateClaim()
  const updateClaim = useUpdateClaim()

  async function handleStatusChange(claim: Claim, newStatus: ClaimStatus) {
    if (newStatus === claim.status) return
    setPendingStatusIds(prev => new Set(prev).add(claim.id))
    try {
      await updateClaim.mutateAsync({ id: claim.id, status: newStatus })
    } finally {
      setPendingStatusIds(prev => { const next = new Set(prev); next.delete(claim.id); return next })
    }
  }

  function openModal() {
    setForm(defaultForm)
    setSubmitError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSubmitError(null)
  }

  function setField(key: keyof NewClaimForm, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    // Resolve claimType and customTypeName — a custom: prefix means a saved custom type
    let claimType = form.claimType
    let customTypeName = form.customTypeName
    if (form.claimType.startsWith('custom:')) {
      claimType = 'other'
      customTypeName = form.claimType.replace('custom:', '')
    }

    if (claimType === 'other' && !customTypeName.trim()) {
      setSubmitError('Especifique o tipo do sinistro')
      return
    }

    try {
      await createClaim.mutateAsync({
        claimNumber: form.claimNumber,
        insurerId: form.insurerId ? parseInt(form.insurerId, 10) : null,
        claimantName: form.claimantName,
        claimantEmail: form.claimantEmail,
        claimantPhone: form.claimantPhone,
        propertyAddress: form.propertyAddress,
        propertyType: form.propertyType as any,
        claimType: claimType as any,
        customTypeName,
        status: form.status as any,
        dateOpened: form.dateOpened,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
        description: form.description,
      })
      closeModal()
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Erro ao criar sinistro.')
    }
  }

  function handleRowClick(claim: Claim) {
    onNavigate({ view: 'claim', id: String(claim.id) })
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sinistros</h1>
        <button className="btn btn-primary" onClick={openModal}>
          + Novo Sinistro
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          className="input"
          type="search"
          placeholder="Buscar por nº, sinistrado ou endereço..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 240px', minWidth: 0 }}
        />
        <select
          className="input"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ flex: '0 1 180px' }}
        >
          <option value="">Todos os status</option>
          {CLAIM_STATUSES.map(s => (
            <option key={s} value={s}>{formatLabel(s)}</option>
          ))}
        </select>
        <select
          className="input"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ flex: '0 1 180px' }}
        >
          <option value="">Todos os tipos</option>
          {CLAIM_TYPES.map(t => (
            <option key={t} value={t}>{formatLabel(t)}</option>
          ))}
          {(customTypes as any[]).length > 0 && (
            <optgroup label="Tipos personalizados">
              {(customTypes as any[]).map((ct: any) => (
                <option key={ct.id} value={`custom:${ct.name}`}>{ct.name}</option>
              ))}
            </optgroup>
          )}
        </select>
        <select
          className="input"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
          style={{ flex: '0 1 160px' }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {!isLoading && claims && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
          {claims.length} sinistro{claims.length !== 1 ? 's' : ''} encontrado{claims.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      ) : !claims || claims.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum sinistro encontrado.</p>
          <button className="btn btn-primary btn-sm" onClick={openModal}>Criar seu primeiro sinistro</button>
        </div>
      ) : (
        <div className="card card-flush">
          <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nº do Sinistro</th>
                <th>Sinistrado</th>
                <th>Endereço do Imóvel</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Valor Est.</th>
                <th>Data de Abertura</th>
              </tr>
            </thead>
            <tbody>
              {claims.map(claim => (
                <tr
                  key={claim.id}
                  onClick={() => handleRowClick(claim)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={e => { e.stopPropagation(); handleRowClick(claim) }}
                    >
                      {claim.claimNumber}
                    </button>
                  </td>
                  <td>{claim.claimantName || '—'}</td>
                  <td>{claim.propertyAddress || '—'}</td>
                  <td>
                    <span className={`badge badge-${claim.claimType}`}>
                      {claim.claimType === 'other' && claim.customTypeName
                        ? claim.customTypeName
                        : formatLabel(claim.claimType)}
                    </span>
                  </td>
                  <td
                    style={{ opacity: pendingStatusIds.has(claim.id) ? 0.6 : 1, transition: 'opacity 0.15s' }}
                  >
                    <select
                      className={`badge badge-${claim.status}`}
                      value={claim.status}
                      disabled={pendingStatusIds.has(claim.id)}
                      onClick={e => e.stopPropagation()}
                      onChange={e => { e.stopPropagation(); handleStatusChange(claim, e.target.value as ClaimStatus) }}
                      style={{ cursor: 'pointer', border: 'none', background: 'none', font: 'inherit', padding: 'inherit', appearance: 'none', WebkitAppearance: 'none' }}
                    >
                      {CLAIM_STATUSES.map(s => (
                        <option key={s} value={s}>{formatLabel(s)}</option>
                      ))}
                    </select>
                  </td>
                  <td>{formatValue(claim.estimatedValue)}</td>
                  <td>{claim.dateOpened}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* New Claim Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal" style={{ width: '600px', maxWidth: '95vw' }}>
            <div className="modal-header">
              <h2>Novo Sinistro</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="grid-2">
                <div className="form-group">
                  <label>Nº do Sinistro *</label>
                  <input
                    className="input"
                    required
                    value={form.claimNumber}
                    onChange={e => setField('claimNumber', e.target.value)}
                    placeholder="CLM-2024-001"
                  />
                </div>
                <div className="form-group">
                  <label>Seguradora</label>
                  <select
                    className="input"
                    value={form.insurerId}
                    onChange={e => setField('insurerId', e.target.value)}
                  >
                    <option value="">Nenhuma</option>
                    {insurers.map((ins: any) => (
                      <option key={ins.id} value={ins.id}>{ins.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nome do Sinistrado</label>
                  <input
                    className="input"
                    value={form.claimantName}
                    onChange={e => setField('claimantName', e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="form-group">
                  <label>Endereço do Imóvel</label>
                  <input
                    className="input"
                    value={form.propertyAddress}
                    onChange={e => setField('propertyAddress', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Tipo de Propriedade</label>
                  <select
                    className="input"
                    value={form.propertyType}
                    onChange={e => setField('propertyType', e.target.value)}
                  >
                    {PROPERTY_TYPES.map(t => (
                      <option key={t} value={t}>{formatLabel(t)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Sinistro</label>
                  <select
                    className="input"
                    value={form.claimType}
                    onChange={e => setField('claimType', e.target.value)}
                  >
                    {CLAIM_TYPES.map(t => (
                      <option key={t} value={t}>{formatLabel(t)}</option>
                    ))}
                    {(customTypes as any[]).length > 0 && (
                      <optgroup label="Tipos personalizados">
                        {(customTypes as any[]).map((ct: any) => (
                          <option key={ct.id} value={`custom:${ct.name}`}>{ct.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                {form.claimType === 'other' && (
                  <div className="form-group">
                    <label>Especificar tipo *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="Ex: Dano por granizo, Colapso de estrutura..."
                      value={form.customTypeName}
                      onChange={e => setField('customTypeName', e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="input"
                    value={form.status}
                    onChange={e => setField('status', e.target.value)}
                  >
                    {CLAIM_STATUSES.map(s => (
                      <option key={s} value={s}>{formatLabel(s)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Data de Abertura</label>
                  <input
                    className="input"
                    type="date"
                    value={form.dateOpened}
                    onChange={e => setField('dateOpened', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Valor Estimado</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.estimatedValue}
                    onChange={e => setField('estimatedValue', e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
              {submitError && (
                <p style={{ color: 'var(--color-danger, #e55)', margin: 0 }}>{submitError}</p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={createClaim.isPending}>
                  {createClaim.isPending ? 'Criando…' : 'Criar Sinistro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
