import { useState, useRef } from 'react'
import { trpcClient } from '../trpc'
import { useTranslation } from '../i18n/context'
import type { TranslationKey } from '../i18n/en'
import type { Page } from '../App'
import { useTeamList, useCreateMember, useCreateMemberWithHistory } from '../api/team'
import { useAiEnabled } from '../api/system'

interface Props {
  onNavigate: (page: Page) => void
}

type CvStructure = {
  label: string; type: string; material: string
  lengthM: number | null; heightM: number | null; spanM: number | null
  foundationType: string; designLoad: number | null
  builtAt: string | null; notes: string
}

type CvHistoryEntry = {
  projectName: string; macroRegion: string; country: string
  place: string; category: string; startDate: string | null | undefined; endDate: string | null | undefined; notes: string
  structures: CvStructure[]
}

type ParsedCv = {
  name: string; title: string; email: string; phone: string; bio: string
  history: CvHistoryEntry[]
}

type FormMode = 'hidden' | 'manual' | 'cv-preview'

const CATEGORIES = ['water', 'transport', 'energy', 'environment', 'planning', 'other']

export default function TeamMembers({ onNavigate }: Props) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<FormMode>('hidden')
  const [form, setForm] = useState({ name: '', title: '', email: '', phone: '', bio: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  // CV state
  const [cvParsing, setCvParsing] = useState(false)
  const [cvError, setCvError] = useState('')
  const [cvHistory, setCvHistory] = useState<CvHistoryEntry[]>([])
  // Stored CV file for both manual and cv-preview modes
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvBase64, setCvBase64] = useState<string>('')
  // Separate ref for manual CV upload (within manual form)
  const manualCvRef = useRef<HTMLInputElement>(null)

  const aiEnabled = useAiEnabled()
  const { data: members, isLoading } = useTeamList()
  const createMember = useCreateMember()
  const createWithHistory = useCreateMemberWithHistory()

  function setField(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const c = { ...e }; delete c[k]; return c })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('errorRequired')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function openManual() {
    setMode('manual')
    setForm({ name: '', title: '', email: '', phone: '', bio: '' })
    setErrors({})
    setCvHistory([])
    setCvError('')
  }

  function closeForm() {
    setMode('hidden')
    setCvHistory([])
    setCvError('')
    setErrors({})
    setCvFile(null)
    setCvBase64('')
  }

  // ── CV upload ──────────────────────────────────────────────────────────────
  async function handleCvFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setCvError(t('cvErrorNotPdf'))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setCvError(t('cvErrorTooLarge'))
      return
    }

    setCvError('')
    setCvParsing(true)
    setMode('cv-preview')

    try {
      const pdfBase64 = await fileToBase64(file)
      setCvFile(file)
      setCvBase64(pdfBase64)
      const result = await trpcClient.team.parseCv.mutate({ pdfBase64 }) as ParsedCv
      setForm({ name: result.name, title: result.title, email: result.email, phone: result.phone, bio: result.bio })
      setCvHistory(result.history ?? [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setCvError(msg)
      setMode('manual')
    } finally {
      setCvParsing(false)
      // Reset input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeHistoryEntry(idx: number) {
    setCvHistory(h => h.filter((_, i) => i !== idx))
  }

  function updateHistoryField(idx: number, key: keyof CvHistoryEntry, value: string) {
    setCvHistory(h => h.map((entry, i) => i === idx ? { ...entry, [key]: value } : entry))
  }

  function removeStructure(hIdx: number, sIdx: number) {
    setCvHistory(h => h.map((entry, i) =>
      i === hIdx ? { ...entry, structures: entry.structures.filter((_, si) => si !== sIdx) } : entry
    ))
  }

  // ── Manual CV picker ────────────────────────────────────────────────────────
  async function handleManualCvFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setCvError(t('cvErrorNotPdf')); return }
    if (file.size > 10 * 1024 * 1024) { setCvError(t('cvErrorTooLarge')); return }
    setCvError('')
    const b64 = await fileToBase64(file)
    setCvFile(file)
    setCvBase64(b64)
    if (errors.cv) setErrors(e => { const c = { ...e }; delete c.cv; return c })
    if (manualCvRef.current) manualCvRef.current.value = ''
  }

  // ── Submit (manual) ────────────────────────────────────────────────────────
  function handleManualSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const baseValid = validate()
    if (!cvFile) { setErrors(e => ({ ...e, cv: t('cvRequired') })); return }
    if (!baseValid) return
    createMember.mutate({
      ...form,
      cv: { filename: cvFile.name, fileSize: cvFile.size, fileData: cvBase64 },
    }, {
      onSuccess: () => {
        closeForm()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 4000)
      },
    })
  }

  // ── Submit (CV preview) ────────────────────────────────────────────────────
  function handleCvSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    createWithHistory.mutate({
      member: form,
      cv: cvFile ? { filename: cvFile.name, fileSize: cvFile.size, fileData: cvBase64 } : undefined,
      history: cvHistory.map(h => ({
        projectName: h.projectName,
        macroRegion: h.macroRegion,
        country: h.country,
        place: h.place,
        category: h.category,
        startDate: h.startDate ?? undefined,
        endDate: h.endDate ?? undefined,
        notes: h.notes,
        geoEntries: [],
        structures: h.structures.map(s => ({
          label: s.label,
          type: s.type as never,
          material: s.material,
          lengthM:  s.lengthM  ?? undefined,
          heightM:  s.heightM  ?? undefined,
          spanM:    s.spanM    ?? undefined,
          foundationType: s.foundationType,
          designLoad: s.designLoad ?? undefined,
          builtAt: s.builtAt ?? undefined,
          notes: s.notes,
        })),
      })),
    }, {
      onSuccess: () => {
        closeForm()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 4000)
      },
    })
  }

  const isBusy = createMember.isPending || createWithHistory.isPending

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1 className="view-title">{t('teamTitle')}</h1>
          <p className="view-subtitle">{t('teamSubtitle')}</p>
        </div>

        {mode === 'hidden' ? (
          <div className="cv-add-actions">
            {/* Hidden file input */}
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handleCvFile}
            />
            <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={!aiEnabled} title={!aiEnabled ? t('aiDisabled') : undefined}>
              {t('btnUploadCv')}
            </button>
            <button className="btn-primary" onClick={openManual}>
              + {t('btnAddMember')}
            </button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={closeForm}>{t('btnCancelEdit')}</button>
        )}
      </div>

      {success && <div className="alert alert--success">{t('successMemberMessage')}</div>}

      {cvError && <div className="alert alert--error">{cvError}</div>}

      {/* CV parsing loader */}
      {cvParsing && (
        <div className="cv-parsing-banner">
          <span className="cv-parsing-spinner" />
          {t('cvParsing')}
        </div>
      )}

      {/* Manual add form */}
      {mode === 'manual' && (
        <form className="inline-form" onSubmit={handleManualSubmit} noValidate>
          <MemberFields form={form} setField={setField} errors={errors} t={t} />
          {/* Required CV upload */}
          <div className="field">
            <label className="field-label">{t('cvFieldLabel')}<span className="field-required"> *</span></label>
            <div className="cv-upload-row">
              <input ref={manualCvRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleManualCvFile} />
              <button type="button" className="btn-secondary btn-sm" onClick={() => manualCvRef.current?.click()}>
                📎 {t('cvFieldLabel')}
              </button>
              {cvFile && <span className="cv-selected-name">✓ {cvFile.name}</span>}
            </div>
            {errors.cv && <p className="field-error">{errors.cv}</p>}
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={closeForm}>{t('btnCancelEdit')}</button>
            <button type="submit" className="btn-submit" disabled={isBusy}>
              {isBusy ? t('btnCreatingMember') : t('btnCreateMember')}
            </button>
          </div>
        </form>
      )}

      {/* CV preview + edit form */}
      {mode === 'cv-preview' && !cvParsing && (
        <form className="inline-form" onSubmit={handleCvSubmit} noValidate>
          <div className="cv-preview-header">
            <span className="cv-badge">{t('cvExtracted')}</span>
            <p className="cv-preview-hint">{t('cvPreviewHint')}</p>
          </div>

          <MemberFields form={form} setField={setField} errors={errors} t={t} />

          {/* Extracted history */}
          {cvHistory.length > 0 && (
            <div className="cv-history-section">
              <h3 className="cv-history-title">
                {t('memberDetailHistory')}
                <span className="cv-history-count">{cvHistory.length}</span>
              </h3>

              {cvHistory.map((entry, hIdx) => (
                <div key={hIdx} className="cv-history-card">
                  <div className="cv-history-card-header">
                    <div className="cv-history-card-meta">
                      <div className="form-grid form-grid--2" style={{ gap: '10px' }}>
                        <CvField label={t('historyFieldProject')}>
                          <input className="input input--sm" value={entry.projectName}
                            onChange={e => updateHistoryField(hIdx, 'projectName', e.target.value)} />
                        </CvField>
                        <CvField label={t('historyFieldCountry')}>
                          <input className="input input--sm" value={entry.country}
                            onChange={e => updateHistoryField(hIdx, 'country', e.target.value)} />
                        </CvField>
                        <CvField label={t('historyFieldMacroRegion')}>
                          <input className="input input--sm" value={entry.macroRegion}
                            onChange={e => updateHistoryField(hIdx, 'macroRegion', e.target.value)} />
                        </CvField>
                        <CvField label={t('historyFieldCategory')}>
                          <select className="input input--sm" value={entry.category}
                            onChange={e => updateHistoryField(hIdx, 'category', e.target.value)}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </CvField>
                        <CvField label={t('historyFieldStartDate')}>
                          <input className="input input--sm" type="date" value={entry.startDate ?? ''}
                            onChange={e => updateHistoryField(hIdx, 'startDate', e.target.value)} />
                        </CvField>
                        <CvField label={t('historyFieldEndDate')}>
                          <input className="input input--sm" type="date" value={entry.endDate ?? ''}
                            onChange={e => updateHistoryField(hIdx, 'endDate', e.target.value)} />
                        </CvField>
                      </div>
                      <CvField label={t('historyFieldNotes')}>
                        <textarea className="input textarea textarea--sm" rows={2} value={entry.notes}
                          onChange={e => updateHistoryField(hIdx, 'notes', e.target.value)} />
                      </CvField>
                    </div>
                    <button type="button" className="btn-remove cv-history-remove"
                      onClick={() => removeHistoryEntry(hIdx)}>✕</button>
                  </div>

                  {/* Structures extracted from CV */}
                  {entry.structures.length > 0 && (
                    <div className="cv-structures">
                      <p className="cv-structures-label">{t('detailStructures')}</p>
                      <div className="cv-structures-list">
                        {entry.structures.map((s, sIdx) => (
                          <div key={sIdx} className="cv-structure-chip">
                            <span className="cv-structure-chip-label">{s.label || '—'}</span>
                            <span className="pill pill--structure">{s.type}</span>
                            {s.material && <span className="cv-structure-chip-mat">{s.material}</span>}
                            {s.notes && <span className="cv-structure-chip-notes">{s.notes}</span>}
                            <button type="button" className="cv-structure-remove"
                              onClick={() => removeStructure(hIdx, sIdx)} title="Remover">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={closeForm}>{t('btnCancelEdit')}</button>
            <button type="submit" className="btn-submit" disabled={isBusy}>
              {isBusy ? t('btnCreatingMember') : t('btnCreateMember')}
            </button>
          </div>
        </form>
      )}

      {/* Members grid */}
      {isLoading ? (
        <p className="muted">{t('loading')}</p>
      ) : !members?.length ? (
        <p className="muted">{t('noMembers')}</p>
      ) : (
        <div className="member-grid">
          {members.map(m => (
            <button
              key={m.id}
              className="member-card"
              onClick={() => onNavigate({ view: 'member', id: m.id, name: m.name })}
            >
              <div className="member-card-avatar">{initials(m.name)}</div>
              <div className="member-card-body">
                <p className="member-card-name">{m.name}</p>
                {m.title && <p className="member-card-title">{m.title}</p>}
                {m.email && <p className="member-card-email">{m.email}</p>}
                <p className="member-card-count">
                  {m.projectCount} {m.projectCount === 1 ? t('memberProjects') : t('memberProjectsPlural')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MemberFields({
  form, setField, errors, t,
}: {
  form: { name: string; title: string; email: string; phone: string; bio: string }
  setField: (k: 'name' | 'title' | 'email' | 'phone' | 'bio', v: string) => void
  errors: Record<string, string>
  t: (k: TranslationKey) => string
}) {
  return (
    <>
      <div className="form-grid form-grid--2">
        <Field label={t('memberFieldName')} required error={errors.name}>
          <input className="input" value={form.name} onChange={e => setField('name', e.target.value)} />
        </Field>
        <Field label={t('memberFieldTitle')}>
          <input className="input" value={form.title} onChange={e => setField('title', e.target.value)} />
        </Field>
        <Field label={t('memberFieldEmail')}>
          <input className="input" type="email" value={form.email} onChange={e => setField('email', e.target.value)} />
        </Field>
        <Field label={t('memberFieldPhone')}>
          <input className="input" value={form.phone} onChange={e => setField('phone', e.target.value)} />
        </Field>
      </div>
      <Field label={t('memberFieldBio')}>
        <textarea className="input textarea" rows={3} value={form.bio} onChange={e => setField('bio', e.target.value)} />
      </Field>
    </>
  )
}

function Field({ label, children, required, error }: {
  label: string; children: React.ReactNode; required?: boolean; error?: string
}) {
  return (
    <div className="field">
      <label className="field-label">
        {label}{required && <span className="field-required"> *</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function CvField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field-label" style={{ fontSize: '11px' }}>{label}</label>
      {children}
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
