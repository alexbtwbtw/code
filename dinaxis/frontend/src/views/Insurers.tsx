import { useState } from 'react'
import {
  useInsurersList,
  useCreateInsurer,
  useUpdateInsurer,
  useDeleteInsurer,
  useInsurerClaimCount,
  useAddInsurerContact,
  useDeleteInsurerContact,
  useSetPrimaryContact,
} from '../api/insurers'
import type { Insurer, InsurerContact } from '@backend/types/insurers'
import type { Page } from '../App'

interface Props {
  onNavigate: (p: Page) => void
}

interface FormState {
  name: string
  contactName: string
  email: string
  phone: string
  address: string
  notes: string
}

interface ContactFormState {
  name: string
  title: string
  email: string
  phone: string
  isPrimary: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
}

const EMPTY_CONTACT_FORM: ContactFormState = {
  name: '',
  title: '',
  email: '',
  phone: '',
  isPrimary: false,
}

// Sub-component so each card can call hooks unconditionally
function InsurerCard({
  insurer,
  onEdit,
  onDelete,
}: {
  insurer: Insurer
  onEdit: (insurer: Insurer) => void
  onDelete: (insurer: Insurer) => void
}) {
  const claimCount = useInsurerClaimCount(insurer.id)
  const hasClaims = (claimCount.data?.count ?? 0) > 0

  const addContact = useAddInsurerContact()
  const deleteContact = useDeleteInsurerContact()
  const setPrimary = useSetPrimaryContact()

  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM)
  const [contactFormError, setContactFormError] = useState<string | null>(null)

  const contacts = insurer.contacts ?? []

  function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    setContactFormError(null)
    if (!contactForm.name.trim()) {
      setContactFormError('O nome do contato é obrigatório.')
      return
    }
    addContact.mutate(
      { insurerId: insurer.id, ...contactForm },
      {
        onSuccess: () => {
          setContactForm(EMPTY_CONTACT_FORM)
          setShowContactForm(false)
        },
        onError: (err) => setContactFormError(err.message),
      },
    )
  }

  function handleDeleteContact(contact: InsurerContact) {
    if (!window.confirm(`Excluir contato "${contact.name}"?`)) return
    deleteContact.mutate({ id: contact.id })
  }

  function handleSetPrimary(contact: InsurerContact) {
    setPrimary.mutate({ insurerId: insurer.id, contactId: contact.id })
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.25rem' }}>
          {insurer.name}
        </div>
        {claimCount.data !== undefined && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {claimCount.data.count} {claimCount.data.count !== 1 ? 'sinistros' : 'sinistro'}
          </div>
        )}
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.875rem' }}>
        {insurer.address && (
          <Field label="Endereço" value={insurer.address} />
        )}
        {insurer.notes && (
          <div style={{ marginTop: '0.25rem', padding: '0.5rem 0.75rem', background: 'var(--surface-2)', borderRadius: '6px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {insurer.notes}
          </div>
        )}
      </div>

      {/* Contacts section */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.625rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Contatos
          </span>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem' }}
            onClick={() => { setShowContactForm(v => !v); setContactFormError(null) }}
          >
            {showContactForm ? 'Cancelar' : '+ Adicionar Contato'}
          </button>
        </div>

        {contacts.length === 0 && !showContactForm && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
            Nenhum contato adicionado.
          </p>
        )}

        {contacts.map(contact => (
          <ContactRow
            key={contact.id}
            contact={contact}
            onDelete={handleDeleteContact}
            onSetPrimary={handleSetPrimary}
          />
        ))}

        {showContactForm && (
          <form
            onSubmit={handleAddContact}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              background: 'var(--surface-2)',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor={`cname-${insurer.id}`} style={{ fontSize: '0.75rem' }}>Nome *</label>
                <input
                  id={`cname-${insurer.id}`}
                  className="input"
                  style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                  value={contactForm.name}
                  onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor={`ctitle-${insurer.id}`} style={{ fontSize: '0.75rem' }}>Cargo</label>
                <input
                  id={`ctitle-${insurer.id}`}
                  className="input"
                  style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                  value={contactForm.title}
                  onChange={e => setContactForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Cargo ou função"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor={`cemail-${insurer.id}`} style={{ fontSize: '0.75rem' }}>E-mail</label>
                <input
                  id={`cemail-${insurer.id}`}
                  className="input"
                  style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                  value={contactForm.email}
                  onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor={`cphone-${insurer.id}`} style={{ fontSize: '0.75rem' }}>Telefone</label>
                <input
                  id={`cphone-${insurer.id}`}
                  className="input"
                  style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                  value={contactForm.phone}
                  onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={contactForm.isPrimary}
                onChange={e => setContactForm(f => ({ ...f, isPrimary: e.target.checked }))}
              />
              Contato principal
            </label>
            {contactFormError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{contactFormError}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addContact.isPending}>
                {addContact.isPending ? 'Adicionando…' : 'Adicionar'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => onEdit(insurer)}>
          Editar
        </button>
        {hasClaims ? (
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: '0.25rem' }}>
            Possui sinistros
          </span>
        ) : (
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(insurer)}>
            Excluir
          </button>
        )}
      </div>
    </div>
  )
}

function ContactRow({
  contact,
  onDelete,
  onSetPrimary,
}: {
  contact: InsurerContact
  onDelete: (c: InsurerContact) => void
  onSetPrimary: (c: InsurerContact) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '0.5rem 0.625rem',
        marginBottom: '0.25rem',
        background: contact.isPrimary ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))' : 'var(--surface-2)',
        borderRadius: '6px',
        border: contact.isPrimary ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' : '1px solid transparent',
        gap: '0.5rem',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{contact.name}</span>
          {contact.isPrimary && (
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '0.0625rem 0.375rem',
              borderRadius: '999px',
              background: 'var(--accent)',
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Principal
            </span>
          )}
        </div>
        {contact.title && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{contact.title}</span>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
          {contact.email && <span>{contact.email}</span>}
          {contact.phone && <span>{contact.phone}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
        {!contact.isPrimary && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem' }}
            onClick={() => onSetPrimary(contact)}
            title="Definir como principal"
          >
            Definir como principal
          </button>
        )}
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem', color: 'var(--danger)' }}
          onClick={() => onDelete(contact)}
          title="Excluir contato"
        >
          Excluir
        </button>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <span style={{ color: 'var(--text-muted)', minWidth: '4.5rem', flexShrink: 0 }}>{label}:</span>
      <span style={{ color: 'var(--text)', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

export default function Insurers({ onNavigate: _ }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Insurer | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const list = useInsurersList()
  const createInsurer = useCreateInsurer()
  const updateInsurer = useUpdateInsurer()
  const deleteInsurer = useDeleteInsurer()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setSubmitError(null)
    setModalOpen(true)
  }

  function openEdit(insurer: Insurer) {
    setEditing(insurer)
    setForm({
      name: insurer.name,
      contactName: insurer.contactName,
      email: insurer.email,
      phone: insurer.phone,
      address: insurer.address,
      notes: insurer.notes,
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

  function handleDelete(insurer: Insurer) {
    if (!window.confirm(`Excluir "${insurer.name}"? Esta ação não pode ser desfeita.`)) return
    deleteInsurer.mutate({ id: insurer.id })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!form.name.trim()) {
      setSubmitError('O nome da empresa é obrigatório.')
      return
    }

    if (editing) {
      updateInsurer.mutate(
        { id: editing.id, ...form },
        { onSuccess: closeModal, onError: (err) => setSubmitError(err.message) },
      )
    } else {
      createInsurer.mutate(form, {
        onSuccess: closeModal,
        onError: (err) => setSubmitError(err.message),
      })
    }
  }

  const isPending = createInsurer.isPending || updateInsurer.isPending

  return (
    <div className="page">
      <div className="page-header">
        <h1>Seguradoras</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          Adicionar Seguradora
        </button>
      </div>

      {/* Loading / error */}
      {list.isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
          <span className="spinner spinner-lg" />
        </div>
      )}
      {list.error && (
        <div className="card" style={{ color: 'var(--danger)' }}>
          {list.error.message}
        </div>
      )}

      {/* List */}
      {list.data && list.data.length > 0 && (
        <div className="grid-2">
          {list.data.map(insurer => (
            <InsurerCard
              key={insurer.id}
              insurer={insurer}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {list.data && list.data.length === 0 && (
        <div className="empty-state">
          <p>Nenhuma seguradora cadastrada.</p>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal" style={{ width: '480px' }}>
            <div className="modal-header">
              <h2>{editing ? 'Editar Seguradora' : 'Adicionar Seguradora'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal} style={{ padding: '0.25rem 0.5rem' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="ins-name">Nome da Empresa *</label>
                <input
                  id="ins-name"
                  className="input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Acme Seguros S.A."
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="ins-contact">Nome do Contato</label>
                <input
                  id="ins-contact"
                  className="input"
                  value={form.contactName}
                  onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  placeholder="João Silva"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ins-email">E-mail</label>
                <input
                  id="ins-email"
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="contato@seguradora.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ins-phone">Telefone</label>
                <input
                  id="ins-phone"
                  className="input"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+55 (11) 00000-0000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ins-address">Endereço</label>
                <textarea
                  id="ins-address"
                  className="input"
                  rows={2}
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Rua Principal, 123, Cidade, Estado 00000-000"
                />
              </div>

              <div className="form-group">
                <label htmlFor="ins-notes">Observações</label>
                <textarea
                  id="ins-notes"
                  className="input"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observações adicionais..."
                />
              </div>

              {submitError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{submitError}</p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
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
