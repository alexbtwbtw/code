import { useState } from 'react'
import {
  useExpertsList,
  useCreateExpert,
  useUpdateExpert,
  useDeleteExpert,
  useExpertClaims,
} from '../api/experts'
import type { Expert } from '@backend/types/experts'
import type { Page } from '../App'

interface Props {
  onNavigate: (p: Page) => void
}

interface FormState {
  name: string
  specialty: string
  email: string
  phone: string
  notes: string
}

const EMPTY_FORM: FormState = {
  name: '',
  specialty: '',
  email: '',
  phone: '',
  notes: '',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Novo', assigned: 'Atribuído', inspection_scheduled: 'Vistoria Agendada',
  inspected: 'Vistoria Concluída', report_pending: 'Relatório Pendente', submitted: 'Relatório Enviado',
  closed: 'Encerrado', disputed: 'Contestado',
}

function ExpertClaimsPanel({ expert, onNavigate }: { expert: Expert; onNavigate: (p: Page) => void }) {
  const { data: claims = [], isLoading } = useExpertClaims(expert.id)

  return (
    <div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.55, marginBottom: '0.5rem' }}>
        Sinistros
      </div>
      {isLoading && <span className="spinner" style={{ width: '1rem', height: '1rem' }} />}
      {!isLoading && (claims as any[]).length === 0 && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Nenhum sinistro atribuído.</p>
      )}
      {(claims as any[]).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {(claims as any[]).map((item: any) => (
            <div
              key={item.claimExpert.id}
              onClick={() => onNavigate({ view: 'claim', id: String(item.claimId) })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                background: 'var(--surface-2)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'color-mix(in srgb, var(--accent) 10%, var(--surface-2))' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)' }}
            >
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {item.claimNumber}
              </span>
              <span className={`badge badge-${item.status}`} style={{ fontSize: '0.7rem' }}>
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
              {item.claimExpert.role && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {item.claimExpert.role}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Experts({ onNavigate }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Expert | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expert | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const list = useExpertsList(search || undefined)
  const createExpert = useCreateExpert()
  const updateExpert = useUpdateExpert()
  const deleteExpert = useDeleteExpert()

  const experts: Expert[] = (list.data as Expert[] | undefined) ?? []

  // Keep selected in sync after mutations
  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSubmitError(null)
    setModalOpen(true)
  }

  function openEdit(expert: Expert) {
    setEditing(expert)
    setForm({
      name: expert.name,
      specialty: expert.specialty,
      email: expert.email,
      phone: expert.phone,
      notes: expert.notes,
    })
    setSubmitError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setSubmitError(null)
  }

  function handleDelete(expert: Expert) {
    if (!window.confirm(`Excluir perito "${expert.name}"? Esta ação não pode ser desfeita.`)) return
    deleteExpert.mutate({ id: expert.id }, {
      onSuccess: () => {
        if (selected?.id === expert.id) setSelected(null)
      },
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    if (!form.name.trim()) {
      setSubmitError('O nome é obrigatório.')
      return
    }

    if (editing) {
      updateExpert.mutate(
        { id: editing.id, ...form },
        {
          onSuccess: (updated) => {
            if (updated && selected?.id === editing.id) setSelected(updated as Expert)
            closeModal()
          },
          onError: (err) => setSubmitError(err.message),
        },
      )
    } else {
      createExpert.mutate(form, {
        onSuccess: (created) => {
          setSelected(created as Expert)
          closeModal()
        },
        onError: (err) => setSubmitError(err.message),
      })
    }
  }

  const isPending = createExpert.isPending || updateExpert.isPending

  return (
    <div className="page">
      <div className="page-header">
        <h1>Peritos</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Novo Perito
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', minHeight: 0 }}>
        {/* Left panel — search + list */}
        <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            className="input"
            placeholder="Pesquisar por nome ou especialidade…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {list.isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <span className="spinner spinner-lg" />
            </div>
          )}

          {list.error && (
            <div className="card" style={{ color: 'var(--danger)' }}>{list.error.message}</div>
          )}

          {!list.isLoading && experts.length === 0 && (
            <div className="empty-state"><p>Nenhum perito encontrado.</p></div>
          )}

          {experts.map(expert => (
            <div
              key={expert.id}
              className="card"
              onClick={() => setSelected(expert)}
              style={{
                cursor: 'pointer',
                border: selected?.id === expert.id ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '0.875rem',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)', marginBottom: '0.2rem' }}>
                {expert.name}
              </div>
              {expert.specialty && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  {expert.specialty}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                {expert.email && <span>{expert.email}</span>}
                {expert.phone && <span>{expert.phone}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Right panel — detail */}
        {selected ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>{selected.name}</div>
                  {selected.specialty && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{selected.specialty}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(selected)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected)}>Excluir</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                {selected.email && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '5rem', flexShrink: 0 }}>E-mail:</span>
                    <span style={{ color: 'var(--text)' }}>{selected.email}</span>
                  </div>
                )}
                {selected.phone && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '5rem', flexShrink: 0 }}>Telefone:</span>
                    <span style={{ color: 'var(--text)' }}>{selected.phone}</span>
                  </div>
                )}
                {selected.notes && (
                  <div style={{
                    marginTop: '0.25rem',
                    padding: '0.625rem 0.875rem',
                    background: 'var(--surface-2)',
                    borderRadius: '6px',
                    color: 'var(--text-muted)',
                    fontSize: '0.8125rem',
                    lineHeight: 1.5,
                  }}>
                    {selected.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <ExpertClaimsPanel expert={selected} onNavigate={onNavigate} />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '12rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              Selecione um perito para ver os detalhes.
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal" style={{ width: '480px' }}>
            <div className="modal-header">
              <h2>{editing ? 'Editar Perito' : 'Novo Perito'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal} style={{ padding: '0.25rem 0.5rem' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              <div className="form-group">
                <label htmlFor="exp-name">Nome *</label>
                <input
                  id="exp-name"
                  className="input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="exp-specialty">Especialidade</label>
                <input
                  id="exp-specialty"
                  className="input"
                  value={form.specialty}
                  onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  placeholder="Ex: Perito em incêndios, Avaliador imobiliário…"
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="exp-email">E-mail</label>
                  <input
                    id="exp-email"
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="perito@email.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="exp-phone">Telefone</label>
                  <input
                    id="exp-phone"
                    className="input"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+55 (11) 00000-0000"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="exp-notes">Observações</label>
                <textarea
                  id="exp-notes"
                  className="input"
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observações adicionais…"
                />
              </div>

              {submitError && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', margin: 0 }}>{submitError}</p>}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending
                    ? (editing ? 'Salvando…' : 'Adicionando…')
                    : (editing ? 'Salvar' : 'Adicionar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
