import React, { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Page } from '../App'
import { useClaimById, useUpdateClaim, useDeleteClaim, useCustomClaimTypes } from '../api/claims'
import { useInsurersList } from '../api/insurers'
import { useInspectionsByClaim, useCreateInspection, useUpdateInspection, useDeleteInspection } from '../api/inspections'
import { useLineItemsByClaim, useClaimTotals, useCreateLineItem, useUpdateLineItem, useDeleteLineItem, useLineItemPhotos, useDeleteLineItemPhoto, uploadLineItemPhoto } from '../api/lineItems'
import { useBillingItemsByClaim, useBillingTotals, useCreateBillingItem, useUpdateBillingItem, useDeleteBillingItem } from '../api/billing'
import { useInvoicesByClaim, useLineItemInvoices, useBillingItemInvoices, useCreateInvoice, useUpdateInvoiceStatus, useDeleteInvoice } from '../api/invoices'
import type { Invoice } from '@backend/types/invoices'
import {
  useDocumentsByClaim, useDeleteDocument,
  useDocumentServeUrl, useDocumentComments, useAddDocumentComment, useDeleteDocumentComment,
  useClaimComments, useAddClaimComment, useDeleteClaimComment,
  useUpdateDocument,
  uploadDocument,
} from '../api/documents'
import type { Inspection } from '@backend/types/inspections'
import type { LineItem } from '@backend/types/lineItems'
import type { BillingItem } from '@backend/types/billing'
import type { Document, DocumentComment, ClaimComment } from '@backend/types/documents'
import { CLAIM_STATUSES, CLAIM_TYPES, PROPERTY_TYPES } from '@backend/schemas/claims'
import { LINE_ITEM_CATEGORIES } from '@backend/schemas/lineItems'
import { BILLING_CATEGORIES } from '@backend/schemas/billing'

// ─── Formatters ──────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatCurrency(v: number | null | undefined) {
  return v != null ? currencyFmt.format(v) : '—'
}

const PT_LABELS: Record<string, string> = {
  new: 'Novo', assigned: 'Atribuído', inspection_scheduled: 'Vistoria Agendada',
  inspected: 'Vistoria Concluída', report_pending: 'Relatório Pendente', submitted: 'Relatório Enviado',
  closed: 'Encerrado', disputed: 'Contestado',
  property_damage: 'Dano à Propriedade', liability: 'Responsabilidade Civil',
  auto: 'Automóvel', flood: 'Inundação', fire: 'Incêndio', theft: 'Furto/Roubo',
  residential: 'Residencial', commercial: 'Comercial', industrial: 'Industrial',
  structure: 'Estrutura', contents: 'Conteúdo', labor: 'Mão de Obra',
  other: 'Outro',
}
function formatLabel(s: string): string {
  if (s.startsWith('custom:')) return s.replace('custom:', '')
  return PT_LABELS[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

// ─── FieldPair ────────────────────────────────────────────────────────────────

function FieldPair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.55, marginBottom: '0.15rem' }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontWeight: 500 }}>{value ?? '—'}</dd>
    </div>
  )
}

// ─── Status Stepper ───────────────────────────────────────────────────────────

const LINEAR_STATUSES = ['new', 'assigned', 'inspection_scheduled', 'inspected', 'report_pending', 'submitted', 'closed']
const DISPUTED_STATUS = 'disputed'

function StatusStepper({ claim }: { claim: any }) {
  const updateClaim = useUpdateClaim()

  const currentStatus: string = claim.status
  const currentLinearIdx = LINEAR_STATUSES.indexOf(currentStatus)

  async function handleStepClick(status: string) {
    if (status === currentStatus || updateClaim.isPending) return
    await updateClaim.mutateAsync({ id: claim.id, status: status as any })
  }

  const circleBase: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'box-shadow 0.15s, background 0.15s',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 700,
    border: '2px solid transparent',
  }

  function getCircleStyle(status: string, idx: number): React.CSSProperties {
    const isPending = updateClaim.isPending && updateClaim.variables?.status === status
    if (status === currentStatus) {
      return {
        ...circleBase,
        background: 'var(--accent)',
        color: '#fff',
        boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent)',
        border: '2px solid var(--accent)',
        cursor: isPending ? 'wait' : 'default',
      }
    }
    // completed (linear only)
    if (idx >= 0 && idx < currentLinearIdx) {
      return {
        ...circleBase,
        background: 'var(--accent)',
        color: '#fff',
        border: '2px solid var(--accent)',
        cursor: updateClaim.isPending ? 'not-allowed' : 'pointer',
      }
    }
    // upcoming
    return {
      ...circleBase,
      background: 'var(--surface-2)',
      color: 'var(--text-muted)',
      border: '2px solid var(--surface-2)',
      cursor: updateClaim.isPending ? 'not-allowed' : 'pointer',
    }
  }

  function getLabelStyle(status: string, idx: number): React.CSSProperties {
    const isCurrent = status === currentStatus
    const isCompleted = idx >= 0 && idx < currentLinearIdx
    return {
      fontSize: '0.7rem',
      textAlign: 'center' as const,
      marginTop: '0.35rem',
      color: (isCurrent || isCompleted) ? 'var(--text)' : 'var(--text-muted)',
      fontWeight: isCurrent ? 600 : 400,
      maxWidth: '72px',
      lineHeight: 1.2,
    }
  }

  function StepCircle({ status, idx }: { status: string; idx: number }) {
    const isPending = updateClaim.isPending && updateClaim.variables?.status === status
    const isCompleted = idx >= 0 && idx < currentLinearIdx
    const isCurrent = status === currentStatus
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', userSelect: 'none' }}>
        <div
          style={getCircleStyle(status, idx)}
          onClick={() => handleStepClick(status)}
          title={PT_LABELS[status] ?? status}
        >
          {isPending
            ? <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : isCompleted || isCurrent
              ? '✓'
              : null}
        </div>
        <div style={getLabelStyle(status, idx)}>{PT_LABELS[status] ?? status}</div>
      </div>
    )
  }

  const connectorStyle: React.CSSProperties = {
    flex: 1,
    height: '2px',
    background: 'var(--surface-2)',
    alignSelf: 'flex-start',
    marginTop: '13px',
    minWidth: '8px',
  }

  const connectorFilledStyle: React.CSSProperties = {
    ...connectorStyle,
    background: 'var(--accent)',
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 0,
      padding: '1rem 1.25rem 0.75rem',
      background: 'var(--surface-1, var(--surface))',
      borderRadius: '0.5rem',
      border: '1px solid var(--border)',
      marginBottom: '1rem',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      paddingBottom: '0.5rem',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {LINEAR_STATUSES.map((status, idx) => (
        <React.Fragment key={status}>
          {idx > 0 && (
            <div style={idx <= currentLinearIdx ? connectorFilledStyle : connectorStyle} />
          )}
          <StepCircle status={status} idx={idx} />
        </React.Fragment>
      ))}
      {/* Disputed separator */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginTop: '0', paddingLeft: '0.75rem', gap: 0 }}>
        <div style={{ width: '1px', height: '28px', background: 'var(--border)', alignSelf: 'flex-start', marginRight: '0.75rem', flexShrink: 0 }} />
        <StepCircle status={DISPUTED_STATUS} idx={-1} />
      </div>
    </div>
  )
}

// ─── Edit Claim Modal ─────────────────────────────────────────────────────────

interface ClaimFormState {
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
  dateClosed: string
  estimatedValue: string
  finalSettlement: string
  adjusterNotes: string
  description: string
}

function EditClaimModal({ claim, insurers, onClose }: { claim: any; insurers: any[]; onClose: () => void }) {
  const updateClaim = useUpdateClaim()
  const { data: customTypes = [] } = useCustomClaimTypes()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ClaimFormState>({
    insurerId: claim.insurerId != null ? String(claim.insurerId) : '',
    claimantName: claim.claimantName ?? '',
    claimantEmail: claim.claimantEmail ?? '',
    claimantPhone: claim.claimantPhone ?? '',
    propertyAddress: claim.propertyAddress ?? '',
    propertyType: claim.propertyType ?? 'residential',
    claimType: claim.claimType ?? 'property_damage',
    customTypeName: claim.customTypeName ?? '',
    status: claim.status ?? 'new',
    dateOpened: claim.dateOpened ?? '',
    dateClosed: claim.dateClosed ?? '',
    estimatedValue: claim.estimatedValue != null ? String(claim.estimatedValue) : '',
    finalSettlement: claim.finalSettlement != null ? String(claim.finalSettlement) : '',
    adjusterNotes: claim.adjusterNotes ?? '',
    description: claim.description ?? '',
  })

  function setField(key: keyof ClaimFormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Resolve claimType and customTypeName — a custom: prefix means a saved custom type
    let claimType = form.claimType
    let customTypeName = form.customTypeName
    if (form.claimType.startsWith('custom:')) {
      claimType = 'other'
      customTypeName = form.claimType.replace('custom:', '')
    }

    if (claimType === 'other' && !customTypeName.trim()) {
      setError('Especifique o tipo do sinistro')
      return
    }

    try {
      await updateClaim.mutateAsync({
        id: claim.id,
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
        dateClosed: form.dateClosed || null,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
        finalSettlement: form.finalSettlement ? parseFloat(form.finalSettlement) : null,
        adjusterNotes: form.adjusterNotes,
        description: form.description,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar as alterações.')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: '640px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>Editar Sinistro</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
        >
          <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="grid-2">
              <div className="form-group">
                <label>Seguradora</label>
                <select className="input" value={form.insurerId} onChange={e => setField('insurerId', e.target.value)}>
                  <option value="">Nenhuma</option>
                  {insurers.map((ins: any) => <option key={ins.id} value={ins.id}>{ins.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="input" value={form.status} onChange={e => setField('status', e.target.value)}>
                  {CLAIM_STATUSES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Nome do Sinistrado</label>
                <input className="input" value={form.claimantName} onChange={e => setField('claimantName', e.target.value)} />
              </div>
              <div className="form-group">
                <label>E-mail do Sinistrado</label>
                <input className="input" type="email" value={form.claimantEmail} onChange={e => setField('claimantEmail', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Telefone do Sinistrado</label>
                <input className="input" value={form.claimantPhone} onChange={e => setField('claimantPhone', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Tipo de Propriedade</label>
                <select className="input" value={form.propertyType} onChange={e => setField('propertyType', e.target.value)}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{formatLabel(t)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Tipo de Sinistro</label>
                <select className="input" value={form.claimType} onChange={e => setField('claimType', e.target.value)}>
                  {CLAIM_TYPES.map(t => <option key={t} value={t}>{formatLabel(t)}</option>)}
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
                <label>Endereço do Imóvel</label>
                <input className="input" value={form.propertyAddress} onChange={e => setField('propertyAddress', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Data de Abertura</label>
                <input className="input" type="date" value={form.dateOpened} onChange={e => setField('dateOpened', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Data de Encerramento</label>
                <input className="input" type="date" value={form.dateClosed} onChange={e => setField('dateClosed', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Valor Estimado</label>
                <input className="input" type="number" min="0" step="0.01" value={form.estimatedValue} onChange={e => setField('estimatedValue', e.target.value)} placeholder="Opcional" />
              </div>
              <div className="form-group">
                <label>Valor do Acordo</label>
                <input className="input" type="number" min="0" step="0.01" value={form.finalSettlement} onChange={e => setField('finalSettlement', e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => setField('description', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label>Observações do Perito</label>
              <textarea className="input" rows={3} value={form.adjusterNotes} onChange={e => setField('adjusterNotes', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            {error && <p style={{ color: 'var(--color-danger, #e55)', margin: 0 }}>{error}</p>}
          </div>
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexShrink: 0, background: 'var(--surface)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={updateClaim.isPending}>
              {updateClaim.isPending ? 'Salvando…' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Inspections Section ──────────────────────────────────────────────────────

interface InspectionFormState {
  scheduledDate: string
  completedDate: string
  findings: string
  adjusterNotes: string
  latitude: string
  longitude: string
}

const defaultInspectionForm: InspectionFormState = {
  scheduledDate: '',
  completedDate: '',
  findings: '',
  adjusterNotes: '',
  latitude: '',
  longitude: '',
}

function InspectionsSection({ claimId }: { claimId: number }) {
  const { data: inspections = [] } = useInspectionsByClaim(claimId)
  const createInspection = useCreateInspection()
  const updateInspection = useUpdateInspection()
  const deleteInspection = useDeleteInspection()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Inspection | null>(null)
  const [form, setForm] = useState<InspectionFormState>(defaultInspectionForm)
  const [error, setError] = useState<string | null>(null)

  function openAdd() {
    setForm(defaultInspectionForm)
    setError(null)
    setAddOpen(true)
  }

  function openEdit(insp: Inspection) {
    setForm({
      scheduledDate: insp.scheduledDate ?? '',
      completedDate: insp.completedDate ?? '',
      findings: insp.findings ?? '',
      adjusterNotes: insp.adjusterNotes ?? '',
      latitude: insp.latitude != null ? String(insp.latitude) : '',
      longitude: insp.longitude != null ? String(insp.longitude) : '',
    })
    setError(null)
    setEditTarget(insp)
  }

  function closeModal() {
    setAddOpen(false)
    setEditTarget(null)
    setError(null)
  }

  function setField(key: keyof InspectionFormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createInspection.mutateAsync({
        claimId,
        scheduledDate: form.scheduledDate || null,
        completedDate: form.completedDate || null,
        findings: form.findings,
        adjusterNotes: form.adjusterNotes,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      })
      closeModal()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao adicionar vistoria.')
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setError(null)
    try {
      await updateInspection.mutateAsync({
        id: editTarget.id,
        scheduledDate: form.scheduledDate || null,
        completedDate: form.completedDate || null,
        findings: form.findings,
        adjusterNotes: form.adjusterNotes,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      })
      closeModal()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao atualizar vistoria.')
    }
  }

  async function handleDelete(insp: Inspection) {
    if (!confirm('Excluir esta vistoria?')) return
    await deleteInspection.mutateAsync({ id: insp.id })
  }

  const modalOpen = addOpen || editTarget != null

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 className="section-title">Vistorias</h2>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Adicionar Vistoria</button>
      </div>

      {(inspections as Inspection[]).length === 0 ? (
        <div className="empty-state"><p>Nenhuma vistoria registrada.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(inspections as Inspection[]).map(insp => (
            <div key={insp.id} className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.5rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
                    <span><strong>Agendada:</strong> {insp.scheduledDate ? formatDate(insp.scheduledDate) : 'Sem data definida'}</span>
                    <span><strong>Concluída:</strong> {insp.completedDate ? formatDate(insp.completedDate) : 'Pendente'}</span>
                    {insp.latitude != null && insp.longitude != null && (
                      <span><strong>GPS:</strong> {insp.latitude.toFixed(6)}, {insp.longitude.toFixed(6)}</span>
                    )}
                  </div>
                  {insp.findings && (
                    <p style={{ margin: '0 0 0.25rem', opacity: 0.85 }}>
                      {insp.findings.length > 200 ? insp.findings.slice(0, 200) + '…' : insp.findings}
                    </p>
                  )}
                  {insp.adjusterNotes && (
                    <p style={{ margin: 0, opacity: 0.65, fontSize: '0.875rem' }}>
                      <em>Observações do Perito: {insp.adjusterNotes}</em>
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(insp)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(insp)}>Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal" style={{ width: '520px', maxWidth: '95vw' }}>
            <div className="modal-header">
              <h2>{addOpen ? 'Adicionar Vistoria' : 'Editar Vistoria'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>
            <form
              onSubmit={addOpen ? handleAdd : handleEdit}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className="grid-2">
                <div className="form-group">
                  <label>Data da Vistoria</label>
                  <input className="input" type="date" value={form.scheduledDate} onChange={e => setField('scheduledDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Data de Conclusão</label>
                  <input className="input" type="date" value={form.completedDate} onChange={e => setField('completedDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Latitude</label>
                  <input className="input" type="number" step="any" value={form.latitude} onChange={e => setField('latitude', e.target.value)} placeholder="Opcional" />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input className="input" type="number" step="any" value={form.longitude} onChange={e => setField('longitude', e.target.value)} placeholder="Opcional" />
                </div>
              </div>
              <div className="form-group">
                <label>Constatações</label>
                <textarea className="input" rows={3} value={form.findings} onChange={e => setField('findings', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label>Observações do Perito</label>
                <textarea className="input" rows={2} value={form.adjusterNotes} onChange={e => setField('adjusterNotes', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              {error && <p style={{ color: 'var(--color-danger, #e55)', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createInspection.isPending || updateInspection.isPending}>
                  {addOpen
                    ? (createInspection.isPending ? 'Adicionando…' : 'Adicionar')
                    : (updateInspection.isPending ? 'Salvando…' : 'Salvar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Line Item Photo Panel ────────────────────────────────────────────────────

function LineItemPhotoPanel({ lineItemId }: { lineItemId: number }) {
  const qc = useQueryClient()
  const { data: photos = [], isLoading } = useLineItemPhotos(lineItemId)
  const deletePhoto = useDeleteLineItemPhoto()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    setUploadError(null)
    try {
      for (const file of files) {
        await uploadLineItemPhoto(lineItemId, file)
      }
      await qc.invalidateQueries({ queryKey: [['lineItems']] })
    } catch (err: any) {
      setUploadError(err?.message ?? 'Erro ao anexar a foto.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Excluir foto "${filename}"?`)) return
    await deletePhoto.mutateAsync({ id })
  }

  return (
    <div style={{ padding: '0.75rem 1rem 1rem', background: 'var(--color-surface-alt, rgba(0,0,0,0.03))', borderTop: '1px solid var(--color-border, rgba(0,0,0,0.08))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fotos</span>
        <label style={{ cursor: uploading ? 'default' : 'pointer' }}>
          {uploading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', opacity: 0.7 }}>
              <div className="spinner" style={{ width: '0.8rem', height: '0.8rem' }} /> Enviando…
            </span>
          ) : (
            <span className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>+ Adicionar Foto</span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {uploadError && <p style={{ color: 'var(--color-danger, #e55)', margin: '0 0 0.5rem', fontSize: '0.8rem' }}>{uploadError}</p>}

      {isLoading ? (
        <div className="spinner" style={{ width: '1rem', height: '1rem' }} />
      ) : (photos as any[]).length === 0 ? (
        <p style={{ margin: 0, opacity: 0.5, fontSize: '0.8rem' }}>Nenhuma foto anexada.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(photos as any[]).map((photo: any) => (
            <div key={photo.id} style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
              <img
                src={`/dinaxis/api/line-item-photos/${photo.id}/blob`}
                alt={photo.filename}
                title={photo.filename}
                onClick={() => setLightbox(`/dinaxis/api/line-item-photos/${photo.id}/blob`)}
                style={{
                  width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px',
                  cursor: 'pointer', border: '1px solid var(--color-border, rgba(0,0,0,0.12))',
                  display: 'block',
                }}
              />
              <button
                onClick={() => handleDelete(photo.id, photo.filename)}
                style={{
                  position: 'absolute', top: '2px', right: '2px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: '11px', lineHeight: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
                title="Excluir foto"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, cursor: 'zoom-out',
          }}
        >
          <img
            src={lightbox}
            alt="Foto ampliada"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

// ─── Line Items Section ───────────────────────────────────────────────────────

interface LineItemFormState {
  description: string
  category: string
  estimatedCost: string
  approvedCost: string
  notes: string
}

const defaultLineItemForm: LineItemFormState = {
  description: '',
  category: 'other',
  estimatedCost: '',
  approvedCost: '',
  notes: '',
}

function LineItemRow({ item, onEdit, onDelete, expandedId, onToggleExpand, invoices }: {
  item: LineItem
  onEdit: (item: LineItem) => void
  onDelete: (item: LineItem) => void
  expandedId: number | null
  onToggleExpand: (id: number) => void
  invoices: Invoice[]
}) {
  const { data: photos = [] } = useLineItemPhotos(item.id)
  const photoCount = (photos as any[]).length
  const isExpanded = expandedId === item.id

  return (
    <>
      <tr>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onToggleExpand(item.id)}
              title={isExpanded ? 'Ocultar fotos' : 'Ver/adicionar fotos'}
              style={{ padding: '0.1rem 0.35rem', fontSize: '0.85rem', opacity: photoCount > 0 ? 1 : 0.45 }}
            >
              {isExpanded ? '▲' : '▼'} {photoCount > 0 ? <span className="badge" style={{ background: 'var(--color-accent, #5b8dee)', color: '#fff', fontSize: '0.7rem', padding: '0 0.35em' }}>{photoCount}</span> : null}
            </button>
            {item.description}
            <InvoiceBadgesForLineItem itemId={item.id} invoices={invoices} />
          </div>
        </td>
        <td>
          <span className={`badge badge-${item.category}`}>{formatLabel(item.category)}</span>
        </td>
        <td>{formatCurrency(item.estimatedCost)}</td>
        <td>{formatCurrency(item.approvedCost)}</td>
        <td>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(item)}>Editar</button>
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(item)}>Excluir</button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} style={{ padding: 0 }}>
            <LineItemPhotoPanel lineItemId={item.id} />
          </td>
        </tr>
      )}
    </>
  )
}

function LineItemsSection({ claimId, invoices }: { claimId: number; invoices: Invoice[] }) {
  const { data: lineItems = [] } = useLineItemsByClaim(claimId)
  const { data: totals } = useClaimTotals(claimId)
  const createLineItem = useCreateLineItem()
  const updateLineItem = useUpdateLineItem()
  const deleteLineItem = useDeleteLineItem()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LineItem | null>(null)
  const [form, setForm] = useState<LineItemFormState>(defaultLineItemForm)
  const [error, setError] = useState<string | null>(null)
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null)

  function toggleExpand(id: number) {
    setExpandedItemId(prev => prev === id ? null : id)
  }

  function openAdd() {
    setForm(defaultLineItemForm)
    setError(null)
    setAddOpen(true)
  }

  function openEdit(item: LineItem) {
    setForm({
      description: item.description,
      category: item.category,
      estimatedCost: String(item.estimatedCost),
      approvedCost: item.approvedCost != null ? String(item.approvedCost) : '',
      notes: item.notes,
    })
    setError(null)
    setEditTarget(item)
  }

  function closeModal() {
    setAddOpen(false)
    setEditTarget(null)
    setError(null)
  }

  function setField(key: keyof LineItemFormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createLineItem.mutateAsync({
        claimId,
        description: form.description,
        category: form.category as any,
        estimatedCost: parseFloat(form.estimatedCost) || 0,
        approvedCost: form.approvedCost ? parseFloat(form.approvedCost) : null,
        notes: form.notes,
      })
      closeModal()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao adicionar item.')
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setError(null)
    try {
      await updateLineItem.mutateAsync({
        id: editTarget.id,
        description: form.description,
        category: form.category as any,
        estimatedCost: parseFloat(form.estimatedCost) || 0,
        approvedCost: form.approvedCost ? parseFloat(form.approvedCost) : null,
        notes: form.notes,
      })
      closeModal()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao atualizar item.')
    }
  }

  async function handleDelete(item: LineItem) {
    if (!confirm('Excluir este item de dano?')) return
    await deleteLineItem.mutateAsync({ id: item.id })
  }

  const modalOpen = addOpen || editTarget != null

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h2 className="section-title">Itens de Dano</h2>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Adicionar Item</button>
      </div>

      {totals && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
          <span><strong>Estimado:</strong> {formatCurrency((totals as any).estimatedTotal)}</span>
          <span><strong>Aprovado:</strong> {formatCurrency((totals as any).approvedTotal)}</span>
          <span><strong>Itens:</strong> {(totals as any).count ?? (lineItems as LineItem[]).length}</span>
        </div>
      )}

      {(lineItems as LineItem[]).length === 0 ? (
        <div className="empty-state"><p>Nenhum item de dano registrado.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Estimado</th>
                <th>Aprovado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(lineItems as LineItem[]).map(item => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  expandedId={expandedItemId}
                  onToggleExpand={toggleExpand}
                  invoices={invoices}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal" style={{ width: '480px', maxWidth: '95vw' }}>
            <div className="modal-header">
              <h2>{addOpen ? 'Adicionar Item de Dano' : 'Editar Item de Dano'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>
            <form
              onSubmit={addOpen ? handleAdd : handleEdit}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className="form-group">
                <label>Descrição *</label>
                <input className="input" required value={form.description} onChange={e => setField('description', e.target.value)} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Categoria</label>
                  <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                    {LINE_ITEM_CATEGORIES.map(c => <option key={c} value={c}>{formatLabel(c)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Custo Estimado</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.estimatedCost} onChange={e => setField('estimatedCost', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Custo Aprovado</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.approvedCost} onChange={e => setField('approvedCost', e.target.value)} placeholder="Opcional" />
                </div>
              </div>
              <div className="form-group">
                <label>Observações</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              {error && <p style={{ color: 'var(--color-danger, #e55)', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createLineItem.isPending || updateLineItem.isPending}>
                  {addOpen
                    ? (createLineItem.isPending ? 'Adicionando…' : 'Adicionar')
                    : (updateLineItem.isPending ? 'Salvando…' : 'Salvar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Billing Section ──────────────────────────────────────────────────────────

const BILLING_CATEGORY_LABELS: Record<string, string> = {
  travel:  'Deslocamento',
  expert:  'Honorários de Perito',
  photos:  'Fotos / Documentação',
  admin:   'Administrativo',
  fees:    'Honorários do Ajustador',
  other:   'Outro',
}

const eurFmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })
function formatBRL(v: number) {
  return eurFmt.format(v)
}

interface BillingFormState {
  description: string
  category: string
  amount: string
  notes: string
}

const defaultBillingForm: BillingFormState = {
  description: '',
  category: 'other',
  amount: '',
  notes: '',
}

function BillingSection({ claimId, invoices }: { claimId: number; invoices: Invoice[] }) {
  const { data: billingItems = [] } = useBillingItemsByClaim(claimId)
  const { data: totals } = useBillingTotals(claimId)
  const createBillingItem = useCreateBillingItem()
  const updateBillingItem = useUpdateBillingItem()
  const deleteBillingItem = useDeleteBillingItem()

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BillingItem | null>(null)
  const [form, setForm] = useState<BillingFormState>(defaultBillingForm)
  const [error, setError] = useState<string | null>(null)

  function openAdd() {
    setForm(defaultBillingForm)
    setError(null)
    setAddOpen(true)
  }

  function openEdit(item: BillingItem) {
    setForm({
      description: item.description,
      category: item.category,
      amount: String(item.amount),
      notes: item.notes,
    })
    setError(null)
    setEditTarget(item)
  }

  function closeModal() {
    setAddOpen(false)
    setEditTarget(null)
    setError(null)
  }

  function setField(key: keyof BillingFormState, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createBillingItem.mutateAsync({
        claimId,
        description: form.description,
        category: form.category as any,
        amount: parseFloat(form.amount) || 0,
        notes: form.notes,
      })
      closeModal()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao adicionar item de faturamento.')
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setError(null)
    try {
      await updateBillingItem.mutateAsync({
        id: editTarget.id,
        description: form.description,
        category: form.category as any,
        amount: parseFloat(form.amount) || 0,
        notes: form.notes,
      })
      closeModal()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao atualizar item de faturamento.')
    }
  }

  async function handleDelete(item: BillingItem) {
    if (!confirm('Excluir este item de faturamento?')) return
    await deleteBillingItem.mutateAsync({ id: item.id })
  }

  const modalOpen = addOpen || editTarget != null

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <h2 className="section-title" style={{ color: 'var(--color-accent-secondary, #7c6fcd)' }}>Faturamento</h2>
          <span style={{ fontSize: '0.75rem', opacity: 0.6, fontStyle: 'italic' }}>Custos do Perito</span>
          {totals && (totals as any).itemCount > 0 && (
            <span className="badge" style={{ background: 'var(--color-accent-secondary, #7c6fcd)', color: '#fff', opacity: 0.9 }}>
              Total: {formatBRL((totals as any).total)}
            </span>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Adicionar Item</button>
      </div>

      {(billingItems as BillingItem[]).length === 0 ? (
        <div className="empty-state"><p>Nenhum item de faturamento registrado.</p></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(billingItems as BillingItem[]).map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {item.description}
                      <InvoiceBadgesForBillingItem itemId={item.id} invoices={invoices} />
                    </div>
                    {item.notes && <span style={{ display: 'block', opacity: 0.55, fontSize: '0.8rem' }}>{item.notes}</span>}
                  </td>
                  <td>
                    <span className={`badge badge-${item.category}`}>{BILLING_CATEGORY_LABELS[item.category] ?? item.category}</span>
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatBRL(item.amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(item)}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="modal" style={{ width: '480px', maxWidth: '95vw' }}>
            <div className="modal-header">
              <h2>{addOpen ? 'Adicionar Item de Faturamento' : 'Editar Item de Faturamento'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>
            <form
              onSubmit={addOpen ? handleAdd : handleEdit}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div className="form-group">
                <label>Descrição *</label>
                <input className="input" required value={form.description} onChange={e => setField('description', e.target.value)} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Categoria</label>
                  <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                    {BILLING_CATEGORIES.map(c => (
                      <option key={c} value={c}>{BILLING_CATEGORY_LABELS[c] ?? c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Valor (€)</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0,00" />
                </div>
              </div>
              <div className="form-group">
                <label>Observações</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} style={{ resize: 'vertical' }} placeholder="Opcional" />
              </div>
              {error && <p style={{ color: 'var(--color-danger, #e55)', margin: 0 }}>{error}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createBillingItem.isPending || updateBillingItem.isPending}>
                  {addOpen
                    ? (createBillingItem.isPending ? 'Adicionando…' : 'Adicionar')
                    : (updateBillingItem.isPending ? 'Salvando…' : 'Salvar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── File Type Icon ───────────────────────────────────────────────────────────

function FileTypeIcon({ mimeType, src, size = 40 }: { mimeType: string; src?: string; size?: number }) {
  if (mimeType.startsWith('image/') && src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: '4px', flexShrink: 0, display: 'block' }}
      />
    )
  }
  if (mimeType === 'application/pdf') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
        <rect width="40" height="40" rx="6" fill="#fee2e2" />
        <rect x="10" y="8" width="20" height="24" rx="2" fill="#ef4444" />
        <rect x="13" y="14" width="14" height="2" rx="1" fill="#fff" />
        <rect x="13" y="19" width="14" height="2" rx="1" fill="#fff" />
        <rect x="13" y="24" width="9" height="2" rx="1" fill="#fff" />
        <text x="20" y="37" textAnchor="middle" fontSize="6" fill="#ef4444" fontWeight="bold" fontFamily="sans-serif">PDF</text>
      </svg>
    )
  }
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
        <rect width="40" height="40" rx="6" fill="#dbeafe" />
        <rect x="10" y="8" width="20" height="24" rx="2" fill="#3b82f6" />
        <rect x="13" y="14" width="14" height="2" rx="1" fill="#fff" />
        <rect x="13" y="19" width="14" height="2" rx="1" fill="#fff" />
        <rect x="13" y="24" width="9" height="2" rx="1" fill="#fff" />
        <text x="20" y="37" textAnchor="middle" fontSize="6" fill="#3b82f6" fontWeight="bold" fontFamily="sans-serif">DOC</text>
      </svg>
    )
  }
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/csv'
  ) {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
        <rect width="40" height="40" rx="6" fill="#dcfce7" />
        <rect x="10" y="8" width="20" height="24" rx="2" fill="#22c55e" />
        <rect x="13" y="14" width="6" height="2" rx="1" fill="#fff" />
        <rect x="21" y="14" width="6" height="2" rx="1" fill="#fff" />
        <rect x="13" y="19" width="6" height="2" rx="1" fill="#fff" />
        <rect x="21" y="19" width="6" height="2" rx="1" fill="#fff" />
        <rect x="13" y="24" width="6" height="2" rx="1" fill="#fff" />
        <rect x="21" y="24" width="6" height="2" rx="1" fill="#fff" />
        <text x="20" y="37" textAnchor="middle" fontSize="6" fill="#22c55e" fontWeight="bold" fontFamily="sans-serif">XLS</text>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
      <rect width="40" height="40" rx="6" fill="#f3f4f6" />
      <rect x="10" y="8" width="20" height="24" rx="2" fill="#9ca3af" />
      <rect x="13" y="14" width="14" height="2" rx="1" fill="#fff" />
      <rect x="13" y="19" width="14" height="2" rx="1" fill="#fff" />
      <rect x="13" y="24" width="9" height="2" rx="1" fill="#fff" />
    </svg>
  )
}

// ─── Pencil (edit) icon ───────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'block' }}>
      <path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Document Viewer Modal ────────────────────────────────────────────────────

function DocumentViewerModal({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const { data: urlData } = useDocumentServeUrl(doc.id)
  const { data: comments = [] } = useDocumentComments(doc.id)
  const addComment = useAddDocumentComment()
  const deleteComment = useDeleteDocumentComment()
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    setCommentError(null)
    try {
      await addComment.mutateAsync({ documentId: doc.id, text: commentText.trim() })
      setCommentText('')
    } catch (err: any) {
      setCommentError(err?.message ?? 'Erro ao adicionar comentário.')
    }
  }

  async function handleDeleteComment(comment: DocumentComment) {
    if (!confirm('Excluir este comentário?')) return
    await deleteComment.mutateAsync({ id: comment.id })
  }

  const url = (urlData as any)?.url ?? ''
  const displayName = doc.label || doc.filename

  function renderViewer() {
    if (!url) return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
    if (doc.mimeType.startsWith('image/')) {
      return <img src={url} alt={doc.filename} style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', margin: '0 auto' }} />
    }
    if (doc.mimeType === 'application/pdf') {
      return <iframe src={url} title={doc.filename} style={{ width: '100%', height: '70vh', border: 'none' }} />
    }
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary">
          Baixar {doc.filename}
        </a>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: '800px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{displayName}</h2>
            {doc.description && (
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.description}
              </p>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '1rem', flex: 1 }}>
          {renderViewer()}

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Comentários do Documento</h3>
            {(comments as DocumentComment[]).length === 0 ? (
              <p style={{ opacity: 0.6 }}>Nenhum comentário.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {(comments as DocumentComment[]).map(c => (
                  <div key={c.id} className="card" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <p style={{ margin: '0 0 0.25rem' }}>{c.text}</p>
                      <small style={{ opacity: 0.6 }}>{formatDate(c.createdAt)}</small>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteComment(c)}>Excluir</button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <textarea
                  className="input"
                  rows={2}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Adicionar comentário..."
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={addComment.isPending || !commentText.trim()}>
                {addComment.isPending ? 'Adicionando…' : 'Adicionar Comentário'}
              </button>
            </form>
            {commentError && <p style={{ color: 'var(--color-danger, #e55)', margin: '0.25rem 0 0' }}>{commentError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Image Lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.85)', zIndex: 1000 }}
    >
      <img
        src={src}
        alt={alt}
        style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '6px', display: 'block' }}
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

// ─── Document Card ────────────────────────────────────────────────────────────

function DocumentCard({ doc, onView, onDelete }: { doc: Document; onView: () => void; onDelete: () => void }) {
  const updateDocument = useUpdateDocument()
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(doc.label)
  const [editDesc, setEditDesc] = useState(doc.description)
  const [lightbox, setLightbox] = useState(false)

  const blobUrl = `/dinaxis/api/documents/${doc.id}/blob`
  const isImage = doc.mimeType.startsWith('image/')
  const displayName = doc.label || doc.filename

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    await updateDocument.mutateAsync({ id: doc.id, label: editLabel, description: editDesc })
    setEditing(false)
  }

  function handleCancelEdit() {
    setEditLabel(doc.label)
    setEditDesc(doc.description)
    setEditing(false)
  }

  return (
    <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        {/* Icon / thumbnail */}
        <div style={{ cursor: isImage ? 'zoom-in' : 'default' }} onClick={isImage ? () => setLightbox(true) : undefined}>
          <FileTypeIcon mimeType={doc.mimeType} src={isImage ? blobUrl : undefined} size={40} />
        </div>

        {/* Name + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ wordBreak: 'break-all', display: 'block', lineHeight: 1.3 }}>{displayName}</strong>
          {doc.label && doc.label !== doc.filename && (
            <span style={{ fontSize: '0.75rem', opacity: 0.5, wordBreak: 'break-all' }}>{doc.filename}</span>
          )}
          {doc.description && (
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', opacity: 0.65, lineHeight: 1.35 }}>{doc.description}</p>
          )}
          <div style={{ opacity: 0.55, fontSize: '0.8rem', display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <span>{formatFileSize(doc.sizeBytes)}</span>
            <span>{formatDate(doc.uploadedAt)}</span>
          </div>
        </div>

        {/* Edit pencil button */}
        <button
          className="btn btn-ghost btn-sm"
          title="Editar rótulo/descrição"
          onClick={() => { setEditing(v => !v); setEditLabel(doc.label); setEditDesc(doc.description) }}
          style={{ padding: '0.25rem', flexShrink: 0 }}
        >
          <PencilIcon />
        </button>
      </div>

      {/* Inline edit form */}
      {editing && (
        <form
          onSubmit={handleSaveEdit}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--color-border, #e5e7eb)', paddingTop: '0.75rem', marginTop: '0.25rem' }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Rótulo</label>
            <input
              className="input"
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              placeholder={doc.filename}
              style={{ fontSize: '0.875rem' }}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.75rem' }}>Descrição</label>
            <textarea
              className="input"
              rows={2}
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Descrição opcional..."
              style={{ fontSize: '0.875rem', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={updateDocument.isPending}>
              {updateDocument.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onView}>Visualizar</button>
        <a href={blobUrl} download={doc.filename} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
          Baixar
        </a>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>Excluir</button>
      </div>

      {lightbox && (
        <ImageLightbox src={blobUrl} alt={displayName} onClose={() => setLightbox(false)} />
      )}
    </div>
  )
}

// ─── Documents Section ────────────────────────────────────────────────────────

function DocumentsSection({ claimId }: { claimId: number }) {
  const qc = useQueryClient()
  const { data: documents = [] } = useDocumentsByClaim(claimId)
  const deleteDocument = useDeleteDocument()
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadLabel, setUploadLabel] = useState('')
  const [uploadDesc, setUploadDesc] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setUploadLabel('')
    setUploadDesc('')
    setUploadError(null)
    setShowUploadForm(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pendingFile) return
    setUploading(true)
    setUploadError(null)
    try {
      await uploadDocument(claimId, pendingFile, uploadLabel, uploadDesc)
      await qc.invalidateQueries({ queryKey: [['documents']] })
      setShowUploadForm(false)
      setPendingFile(null)
      setUploadLabel('')
      setUploadDesc('')
    } catch (err: any) {
      setUploadError(err?.message ?? 'Erro ao anexar o documento.')
    } finally {
      setUploading(false)
    }
  }

  function handleCancelUpload() {
    setShowUploadForm(false)
    setPendingFile(null)
    setUploadLabel('')
    setUploadDesc('')
    setUploadError(null)
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Excluir "${doc.label || doc.filename}"?`)) return
    await deleteDocument.mutateAsync({ id: doc.id })
  }

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 className="section-title">Documentos</h2>
        <label style={{ cursor: 'pointer' }}>
          <span className="btn btn-primary btn-sm">Anexar Documento</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />
        </label>
      </div>

      {/* Upload form — shown after file is selected */}
      {showUploadForm && pendingFile && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem', border: '2px solid var(--color-primary, #6366f1)' }}>
          <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
              Arquivo selecionado: <strong>{pendingFile.name}</strong> ({formatFileSize(pendingFile.size)})
            </div>
            <div className="grid-2">
              <div className="form-group" style={{ margin: 0 }}>
                <label>Rótulo</label>
                <input
                  className="input"
                  value={uploadLabel}
                  onChange={e => setUploadLabel(e.target.value)}
                  placeholder={pendingFile.name}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Descrição</label>
                <input
                  className="input"
                  value={uploadDesc}
                  onChange={e => setUploadDesc(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>
            {uploadError && <p style={{ color: 'var(--color-danger, #e55)', margin: 0 }}>{uploadError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelUpload} disabled={uploading}>Cancelar</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={uploading}>
                {uploading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div className="spinner" style={{ width: '0.9rem', height: '0.9rem' }} /> Anexando…
                  </span>
                ) : 'Anexar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!showUploadForm && uploadError && (
        <p style={{ color: 'var(--color-danger, #e55)', marginBottom: '0.75rem' }}>{uploadError}</p>
      )}

      {(documents as Document[]).length === 0 ? (
        <div className="empty-state"><p>Nenhum documento anexado.</p></div>
      ) : (
        <div className="grid-2">
          {(documents as Document[]).map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onView={() => setSelectedDoc(doc)}
              onDelete={() => handleDelete(doc)}
            />
          ))}
        </div>
      )}

      {selectedDoc && (
        <DocumentViewerModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  )
}

// ─── Claim Comments Section ───────────────────────────────────────────────────

function ClaimCommentsSection({ claimId }: { claimId: number }) {
  const { data: comments = [] } = useClaimComments(claimId)
  const addComment = useAddClaimComment()
  const deleteComment = useDeleteClaimComment()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setError(null)
    try {
      await addComment.mutateAsync({ claimId, text: text.trim() })
      setText('')
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao adicionar comentário.')
    }
  }

  async function handleDelete(comment: ClaimComment) {
    if (!confirm('Excluir este comentário?')) return
    await deleteComment.mutateAsync({ id: comment.id })
  }

  return (
    <div className="section">
      <h2 className="section-title" style={{ marginBottom: '1rem' }}>Comentários</h2>

      {(comments as ClaimComment[]).length === 0 ? (
        <p style={{ opacity: 0.6 }}>Nenhum comentário.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {(comments as ClaimComment[]).map(c => (
            <div key={c.id} className="card" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div>
                <p style={{ margin: '0 0 0.25rem' }}>{c.text}</p>
                <small style={{ opacity: 0.6 }}>{formatDate(c.createdAt)}</small>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>Excluir</button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, margin: 0 }}>
          <textarea
            className="input"
            rows={2}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Adicionar comentário..."
            style={{ resize: 'vertical' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={addComment.isPending || !text.trim()}>
          {addComment.isPending ? 'Adicionando…' : 'Adicionar Comentário'}
        </button>
      </form>
      {error && <p style={{ color: 'var(--color-danger, #e55)', margin: '0.25rem 0 0' }}>{error}</p>}
    </div>
  )
}

// ─── Invoice Badges (for line/billing item rows) ──────────────────────────────

function InvoiceBadgesForLineItem({ itemId, invoices }: { itemId: number; invoices: Invoice[] }) {
  const { data: invoiceIds = [] } = useLineItemInvoices(itemId)
  if ((invoiceIds as string[]).length === 0) return null
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.25rem', marginLeft: '0.4rem' }}>
      {(invoiceIds as string[]).map(iid => {
        const inv = invoices.find(i => i.id === iid)
        if (!inv) return null
        return (
          <span
            key={iid}
            onClick={() => document.getElementById('faturas')?.scrollIntoView({ behavior: 'smooth' })}
            title={`Ver fatura ${inv.invoiceNumber}`}
            style={{
              display: 'inline-block', fontSize: '0.68rem', padding: '0.1rem 0.45rem',
              borderRadius: '999px', background: 'var(--surface-2, #f1f5f9)', border: '1px solid var(--border, #e2e8f0)',
              color: 'var(--text-muted)', cursor: 'pointer', fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap', lineHeight: 1.5,
            }}
          >
            {inv.invoiceNumber}
          </span>
        )
      })}
    </span>
  )
}

function InvoiceBadgesForBillingItem({ itemId, invoices }: { itemId: number; invoices: Invoice[] }) {
  const { data: invoiceIds = [] } = useBillingItemInvoices(itemId)
  if ((invoiceIds as string[]).length === 0) return null
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.25rem', marginLeft: '0.4rem' }}>
      {(invoiceIds as string[]).map(iid => {
        const inv = invoices.find(i => i.id === iid)
        if (!inv) return null
        return (
          <span
            key={iid}
            onClick={() => document.getElementById('faturas')?.scrollIntoView({ behavior: 'smooth' })}
            title={`Ver fatura ${inv.invoiceNumber}`}
            style={{
              display: 'inline-block', fontSize: '0.68rem', padding: '0.1rem 0.45rem',
              borderRadius: '999px', background: 'var(--surface-2, #f1f5f9)', border: '1px solid var(--border, #e2e8f0)',
              color: 'var(--text-muted)', cursor: 'pointer', fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap', lineHeight: 1.5,
            }}
          >
            {inv.invoiceNumber}
          </span>
        )
      })}
    </span>
  )
}

// ─── Faturas Section ──────────────────────────────────────────────────────────

interface InvoiceCreationModalProps {
  claimId: number
  lineItems: any[]
  billingItems: any[]
  onClose: () => void
}

function InvoiceCreationModal({ claimId, lineItems, billingItems, onClose }: InvoiceCreationModalProps) {
  const createInvoice = useCreateInvoice()
  const today = new Date().toISOString().slice(0, 10)
  const [issuedDate, setIssuedDate] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedLineItems, setSelectedLineItems] = useState<Set<number>>(new Set())
  const [selectedBillingItems, setSelectedBillingItems] = useState<Set<number>>(new Set())

  function toggleLineItem(id: number) {
    setSelectedLineItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleBillingItem(id: number) {
    setSelectedBillingItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const runningTotal = [
    ...lineItems.filter(li => selectedLineItems.has(li.id)).map(li => li.approvedCost ?? li.estimatedCost ?? 0),
    ...billingItems.filter(bi => selectedBillingItems.has(bi.id)).map(bi => bi.amount ?? 0),
  ].reduce((a, b) => a + b, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const items: any[] = [
      ...lineItems
        .filter(li => selectedLineItems.has(li.id))
        .map(li => ({
          itemType: 'line_item' as const,
          itemId: li.id,
          description: li.description,
          quantity: 1,
          unitPrice: li.approvedCost ?? li.estimatedCost ?? 0,
          amount: li.approvedCost ?? li.estimatedCost ?? 0,
        })),
      ...billingItems
        .filter(bi => selectedBillingItems.has(bi.id))
        .map(bi => ({
          itemType: 'billing_item' as const,
          itemId: bi.id,
          description: bi.description,
          quantity: 1,
          unitPrice: bi.amount ?? 0,
          amount: bi.amount ?? 0,
        })),
    ]

    if (items.length === 0) {
      setError('Selecione pelo menos um item.')
      return
    }

    try {
      await createInvoice.mutateAsync({
        claimId,
        issuedDate,
        dueDate: dueDate || undefined,
        notes,
        items,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao gerar fatura.')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ width: '600px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>Nova Fatura</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="grid-2">
              <div className="form-group">
                <label>Data de Emissão *</label>
                <input className="input" type="date" required value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Data de Vencimento</label>
                <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>

            {lineItems.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.6, marginBottom: '0.5rem' }}>
                  Itens de Dano
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {lineItems.map((li: any) => {
                    const cost = li.approvedCost ?? li.estimatedCost ?? 0
                    return (
                      <label key={li.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', cursor: 'pointer', background: selectedLineItems.has(li.id) ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent' }}>
                        <input
                          type="checkbox"
                          checked={selectedLineItems.has(li.id)}
                          onChange={() => toggleLineItem(li.id)}
                        />
                        <span style={{ flex: 1, fontSize: '0.875rem' }}>{li.description}</span>
                        <span style={{ fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums', opacity: 0.75 }}>{formatCurrency(cost)}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {billingItems.length > 0 && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.6, marginBottom: '0.5rem' }}>
                  Itens de Faturamento
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {billingItems.map((bi: any) => (
                    <label key={bi.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', cursor: 'pointer', background: selectedBillingItems.has(bi.id) ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent' }}>
                      <input
                        type="checkbox"
                        checked={selectedBillingItems.has(bi.id)}
                        onChange={() => toggleBillingItem(bi.id)}
                      />
                      <span style={{ flex: 1, fontSize: '0.875rem' }}>{bi.description}</span>
                      <span style={{ fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums', opacity: 0.75 }}>{formatCurrency(bi.amount)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Notas</label>
              <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }} placeholder="Opcional" />
            </div>

            {(selectedLineItems.size > 0 || selectedBillingItems.size > 0) && (
              <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-2, #f8fafc)', borderRadius: '0.5rem', border: '1px solid var(--border)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>Total selecionado</span>
                <span>{formatCurrency(runningTotal)}</span>
              </div>
            )}

            {error && <p style={{ color: 'var(--color-danger, #e55)', margin: 0 }}>{error}</p>}
          </div>
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexShrink: 0, background: 'var(--surface)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? 'Gerando…' : 'Gerar Fatura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  paid: 'Paga',
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  sent: '#3b82f6',
  paid: '#22c55e',
}

function FaturasSection({ claimId, lineItems, billingItems }: { claimId: number; lineItems: any[]; billingItems: any[] }) {
  const { data: invoices = [] } = useInvoicesByClaim(claimId)
  const updateStatus = useUpdateInvoiceStatus()
  const deleteInvoice = useDeleteInvoice()
  const [createOpen, setCreateOpen] = useState(false)

  async function handleStatusChange(id: string, status: string) {
    await updateStatus.mutateAsync({ id, status: status as any })
  }

  async function handleDelete(inv: Invoice) {
    if (!confirm(`Excluir fatura ${inv.invoiceNumber}?`)) return
    await deleteInvoice.mutateAsync({ id: inv.id })
  }

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 className="section-title">Faturas</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>+ Nova Fatura</button>
      </div>

      {(invoices as Invoice[]).length === 0 ? (
        <div className="empty-state"><p>Nenhuma fatura gerada.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(invoices as Invoice[]).map(inv => (
            <div key={inv.id} className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{inv.invoiceNumber}</strong>
                    <span style={{
                      display: 'inline-block', fontSize: '0.75rem', padding: '0.15rem 0.6rem', borderRadius: '999px',
                      background: INVOICE_STATUS_COLORS[inv.status] ?? '#6b7280', color: '#fff', fontWeight: 600,
                    }}>
                      {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.7, display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <span>Emitida: {inv.issuedDate}</span>
                    {inv.dueDate && <span>Vencimento: {inv.dueDate}</span>}
                    <span style={{ fontWeight: 600, opacity: 1 }}>{formatCurrency(inv.totalAmount)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                  <a
                    href={`/dinaxis/api/invoices/${inv.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: 'none' }}
                  >
                    Ver PDF
                  </a>
                  <select
                    className="input"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', height: 'auto' }}
                    value={inv.status}
                    onChange={e => handleStatusChange(inv.id, e.target.value)}
                  >
                    <option value="draft">Rascunho</option>
                    <option value="sent">Enviada</option>
                    <option value="paid">Paga</option>
                  </select>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inv)}>Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <InvoiceCreationModal
          claimId={claimId}
          lineItems={lineItems}
          billingItems={billingItems}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClaimDetail({ id, onNavigate }: { id: string; onNavigate: (p: Page) => void }) {
  const claimId = parseInt(id, 10)
  const { data: claim, isLoading, error } = useClaimById(isNaN(claimId) ? 0 : claimId)
  const { data: insurers = [] } = useInsurersList()
  const { data: invoices = [] } = useInvoicesByClaim(claimId)
  const { data: lineItems = [] } = useLineItemsByClaim(claimId)
  const { data: billingItems = [] } = useBillingItemsByClaim(claimId)
  const deleteClaim = useDeleteClaim()
  const [editOpen, setEditOpen] = useState(false)

  const insurer = claim?.insurerId != null
    ? (insurers as any[]).find(i => i.id === claim.insurerId)
    : null

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este sinistro?')) return
    await deleteClaim.mutateAsync({ id: claimId })
    onNavigate({ view: 'claims' })
  }

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (error || !claim) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Sinistro não encontrado.</p>
          <button className="btn btn-secondary" onClick={() => onNavigate({ view: 'claims' })}>
            ← Sinistros
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate({ view: 'claims' })}>
            ← Sinistros
          </button>
          <h1 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {claim.claimNumber}
          </h1>
          <span className={`badge badge-${claim.status}`}>{formatLabel(claim.status)}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={() => setEditOpen(true)}>Editar Sinistro</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleteClaim.isPending}>
            {deleteClaim.isPending ? 'Excluindo…' : 'Excluir Sinistro'}
          </button>
        </div>
      </div>

      {/* Status Stepper */}
      <StatusStepper claim={claim} />

      {/* Section 1 — Overview */}
      <div id="visao-geral" className="section">
        <h2 className="section-title">Visão Geral</h2>
        <div className="grid-2">
          <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <FieldPair label="Nº do Sinistro" value={claim.claimNumber} />
            <FieldPair label="Seguradora" value={insurer?.name ?? 'Desconhecida'} />
            <FieldPair label="Tipo de Sinistro" value={<span className={`badge badge-${claim.claimType}`}>{claim.claimType === 'other' && claim.customTypeName ? claim.customTypeName : formatLabel(claim.claimType)}</span>} />
            <FieldPair label="Tipo de Propriedade" value={formatLabel(claim.propertyType)} />
            <FieldPair label="Endereço do Imóvel" value={claim.propertyAddress || '—'} />
            <FieldPair label="Data de Abertura" value={formatDate(claim.dateOpened)} />
            <FieldPair label="Data de Encerramento" value={claim.dateClosed ? formatDate(claim.dateClosed) : 'Em Aberto'} />
            <FieldPair label="Valor Estimado" value={formatCurrency(claim.estimatedValue)} />
            <FieldPair label="Valor do Acordo" value={formatCurrency(claim.finalSettlement)} />
          </dl>
          <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <FieldPair label="Nome do Sinistrado" value={claim.claimantName || '—'} />
            <FieldPair label="E-mail do Sinistrado" value={claim.claimantEmail || '—'} />
            <FieldPair label="Telefone do Sinistrado" value={claim.claimantPhone || '—'} />
            {claim.description ? (
              <FieldPair label="Descrição" value={claim.description} />
            ) : null}
            {claim.adjusterNotes ? (
              <FieldPair label="Observações do Perito" value={claim.adjusterNotes} />
            ) : null}
          </dl>
        </div>
      </div>

      {/* Section 2 — Inspections */}
      <div id="vistorias">
        <InspectionsSection claimId={claimId} />
      </div>

      {/* Section 3 — Line Items */}
      <div id="itens-dano">
        <LineItemsSection claimId={claimId} invoices={invoices as Invoice[]} />
      </div>

      {/* Section 4 — Billing (adjuster's own costs) */}
      <div id="faturamento">
        <BillingSection claimId={claimId} invoices={invoices as Invoice[]} />
      </div>

      {/* Section 5 — Faturas */}
      <div id="faturas">
        <FaturasSection claimId={claimId} lineItems={lineItems as any[]} billingItems={billingItems as any[]} />
      </div>

      {/* Section 6 — Documents */}
      <div id="documentos">
        <DocumentsSection claimId={claimId} />
      </div>

      {/* Section 6 — Comments */}
      <div id="comentarios">
        <ClaimCommentsSection claimId={claimId} />
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <EditClaimModal
          claim={claim}
          insurers={insurers as any[]}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}
