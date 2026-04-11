import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { trpc, trpcClient } from '../trpc'
import { useTranslation } from '../i18n/context'
import { STATUSES, CATEGORIES, STATUS_KEY, CAT_KEY, PROJECT_PRIORITIES, PRIORITY_KEY } from '../constants/projects'
import { GeoSection, StructureSection, Field } from '../components/shared'
import type { GeoFormEntry, StructureFormEntry } from '../components/shared'

const emptyForm = () => ({
  refCode: '', name: '', client: '',
  macroRegion: '', country: '', place: '',
  category: 'other' as string, status: 'planning' as string, priority: 'medium' as string,
  startDate: '', endDate: '', budget: '', currency: 'EUR',
  projectManager: '', teamSize: '', description: '', tags: '',
})

export default function AddProject() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState(emptyForm())
  const [geoEntries, setGeoEntries] = useState<GeoFormEntry[]>([])
  const [structures, setStructures] = useState<StructureFormEntry[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [pmFocused, setPmFocused] = useState(false)

  const { data: teamMembers } = useQuery(trpc.team.list.queryOptions())
  const pmSuggestions = (teamMembers ?? []).filter(m =>
    form.projectManager && m.name.toLowerCase().includes(form.projectManager.toLowerCase())
  )

  // PDF import state
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [pdfExtracted, setPdfExtracted] = useState(false)

  // ── PDF import ─────────────────────────────────────────────────────────────
  async function handlePdfFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setPdfError(t('cvErrorNotPdf')); return }
    if (file.size > 10 * 1024 * 1024) { setPdfError(t('cvErrorTooLarge')); return }

    setPdfError('')
    setPdfParsing(true)
    setPdfExtracted(false)

    try {
      const pdfBase64 = await fileToBase64(file)
      const result = await trpcClient.projects.parseProject.mutate({ pdfBase64 })
      setForm({
        refCode: result.refCode || '',
        name: result.name || '',
        client: result.client || '',
        macroRegion: result.macroRegion || '',
        country: result.country || '',
        place: result.place || '',
        category: result.category || 'other',
        status: result.status || 'planning',
        priority: 'medium',
        startDate: result.startDate?.slice(0, 10) || '',
        endDate: result.endDate?.slice(0, 10) || '',
        budget: result.budget != null ? String(result.budget) : '',
        currency: result.currency || 'EUR',
        projectManager: result.projectManager || '',
        teamSize: result.teamSize != null ? String(result.teamSize) : '',
        description: result.description || '',
        tags: result.tags || '',
      })
      setGeoEntries((result.geoEntries ?? []).map(g => ({
        pointLabel: g.pointLabel || '',
        type: g.type || 'borehole',
        depth: g.depth != null ? String(g.depth) : '',
        soilType: g.soilType || '',
        rockType: g.rockType || '',
        groundwaterDepth: g.groundwaterDepth != null ? String(g.groundwaterDepth) : '',
        bearingCapacity: g.bearingCapacity != null ? String(g.bearingCapacity) : '',
        sptNValue: g.sptNValue != null ? String(g.sptNValue) : '',
        seismicClass: g.seismicClass || '',
        latitude: g.latitude != null ? String(g.latitude) : '',
        longitude: g.longitude != null ? String(g.longitude) : '',
        sampledAt: g.sampledAt?.slice(0, 10) || '',
        notes: g.notes || '',
      })))
      setStructures((result.structures ?? []).map(s => ({
        label: s.label || '',
        type: s.type || 'other',
        material: s.material || '',
        lengthM: s.lengthM != null ? String(s.lengthM) : '',
        heightM: s.heightM != null ? String(s.heightM) : '',
        spanM: s.spanM != null ? String(s.spanM) : '',
        foundationType: s.foundationType || '',
        designLoad: s.designLoad != null ? String(s.designLoad) : '',
        latitude: '',
        longitude: '',
        builtAt: s.builtAt?.slice(0, 10) || '',
        notes: s.notes || '',
      })))
      setPdfExtracted(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setPdfError(msg)
    } finally {
      setPdfParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const createProject = useMutation({
    ...trpc.projects.create.mutationOptions(),
    onSuccess: async (newProject) => {
      for (const g of geoEntries) {
        await trpcClient.geo.create.mutate({
          projectId: newProject.id,
          pointLabel: g.pointLabel, type: g.type,
          depth: g.depth ? parseFloat(g.depth) : undefined,
          soilType: g.soilType, rockType: g.rockType,
          groundwaterDepth: g.groundwaterDepth ? parseFloat(g.groundwaterDepth) : undefined,
          bearingCapacity: g.bearingCapacity ? parseFloat(g.bearingCapacity) : undefined,
          sptNValue: g.sptNValue ? parseInt(g.sptNValue) : undefined,
          seismicClass: g.seismicClass,
          latitude: g.latitude ? parseFloat(g.latitude) : undefined,
          longitude: g.longitude ? parseFloat(g.longitude) : undefined,
          sampledAt: g.sampledAt || undefined, notes: g.notes,
        })
      }
      for (const s of structures) {
        await trpcClient.structures.create.mutate({
          projectId: newProject.id,
          label: s.label, type: s.type, material: s.material,
          lengthM: s.lengthM ? parseFloat(s.lengthM) : undefined,
          heightM: s.heightM ? parseFloat(s.heightM) : undefined,
          spanM: s.spanM ? parseFloat(s.spanM) : undefined,
          foundationType: s.foundationType,
          designLoad: s.designLoad ? parseFloat(s.designLoad) : undefined,
          latitude: s.latitude ? parseFloat(s.latitude) : undefined,
          longitude: s.longitude ? parseFloat(s.longitude) : undefined,
          builtAt: s.builtAt || undefined, notes: s.notes,
        })
      }
      await qc.invalidateQueries({ queryKey: [['projects']] })
      setSuccess(true)
      setForm(emptyForm())
      setGeoEntries([])
      setStructures([])
      setErrors({})
      setPdfExtracted(false)
      setTimeout(() => setSuccess(false), 4000)
    },
  })

  function setField(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => { const copy = { ...e }; delete copy[k]; return copy })
  }

  function setGeoField(i: number, k: keyof GeoFormEntry, v: string) {
    setGeoEntries(es => es.map((e, idx) => idx === i ? { ...e, [k]: v } : e))
  }

  function setStructField(i: number, k: keyof StructureFormEntry, v: string) {
    setStructures(es => es.map((e, idx) => idx === i ? { ...e, [k]: v } : e))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.refCode.trim()) e.refCode = t('errorRequired')
    if (!form.name.trim()) e.name = t('errorRequired')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    createProject.mutate({
      refCode: form.refCode, name: form.name, client: form.client,
      macroRegion: form.macroRegion, country: form.country, place: form.place,
      category: form.category as typeof CATEGORIES[number],
      status: form.status as typeof STATUSES[number],
      priority: form.priority as typeof PROJECT_PRIORITIES[number],
      startDate: form.startDate || undefined, endDate: form.endDate || undefined,
      budget: form.budget ? parseFloat(form.budget) : undefined,
      currency: form.currency, projectManager: form.projectManager,
      teamSize: form.teamSize ? parseInt(form.teamSize) : 0,
      description: form.description, tags: form.tags,
    })
  }

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>{t('addTitle')}</h1>
          <p className="view-sub">{t('addSubtitle')}</p>
        </div>
        <div className="cv-add-actions">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handlePdfFile}
          />
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>
            {t('btnImportProjectPdf')}
          </button>
        </div>
      </div>

      {success && <div className="alert alert--success">{t('successMessage')}</div>}
      {pdfError && <div className="alert alert--error">{pdfError}</div>}

      {pdfParsing && (
        <div className="cv-parsing-banner">
          <span className="cv-parsing-spinner" />
          {t('projectPdfParsing')}
        </div>
      )}

      <form className="project-form" onSubmit={handleSubmit} noValidate>
        {pdfExtracted && (
          <div className="cv-preview-header">
            <span className="cv-badge">{t('projectPdfExtracted')}</span>
            <p className="cv-preview-hint">{t('projectPdfPreviewHint')}</p>
          </div>
        )}
        <div className="form-section">
          <div className="form-grid form-grid--2">
            <Field label={t('fieldRefCode')} required error={errors.refCode}>
              <input className="input" value={form.refCode} onChange={e => setField('refCode', e.target.value)} placeholder="ex. PT-2025-001" />
            </Field>
            <Field label={t('fieldName')} required error={errors.name}>
              <input className="input" value={form.name} onChange={e => setField('name', e.target.value)} />
            </Field>
            <Field label={t('fieldClient')}>
              <input className="input" value={form.client} onChange={e => setField('client', e.target.value)} />
            </Field>
            <Field label={t('fieldPM')}>
              <div className="pm-autocomplete">
                <input
                  className="input"
                  value={form.projectManager}
                  onChange={e => setField('projectManager', e.target.value)}
                  onFocus={() => setPmFocused(true)}
                  onBlur={() => setTimeout(() => setPmFocused(false), 150)}
                  autoComplete="off"
                />
                {pmFocused && pmSuggestions.length > 0 && form.projectManager && (
                  <ul className="pm-suggestions">
                    {pmSuggestions.map(m => (
                      <li key={m.id} onMouseDown={() => setField('projectManager', m.name)}>
                        <span className="pm-sug-name">{m.name}</span>
                        <span className="pm-sug-title">{m.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>
          </div>
          <div className="form-grid form-grid--3">
            <Field label={t('fieldMacroRegion')}>
              <input className="input" value={form.macroRegion} onChange={e => setField('macroRegion', e.target.value)} placeholder="ex. EMEA" />
            </Field>
            <Field label={t('fieldCountry')}>
              <input className="input" value={form.country} onChange={e => setField('country', e.target.value)} />
            </Field>
            <Field label={t('fieldPlace')}>
              <input className="input" value={form.place} onChange={e => setField('place', e.target.value)} placeholder="ex. Lisboa" />
            </Field>
          </div>
          <div className="form-grid form-grid--2">
            <Field label={t('fieldCategory')}>
              <select className="input" value={form.category} onChange={e => setField('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{t(CAT_KEY[c])}</option>)}
              </select>
            </Field>
            <Field label={t('fieldStatus')}>
              <select className="input" value={form.status} onChange={e => setField('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
              </select>
            </Field>
            <Field label={t('fieldPriority')}>
              <select className="input" value={form.priority} onChange={e => setField('priority', e.target.value)}>
                {PROJECT_PRIORITIES.map(p => <option key={p} value={p}>{t(PRIORITY_KEY[p])}</option>)}
              </select>
            </Field>
            <Field label={t('fieldStartDate')}>
              <input className="input" type="date" value={form.startDate} onChange={e => setField('startDate', e.target.value)} />
            </Field>
            <Field label={t('fieldEndDate')}>
              <input className="input" type="date" value={form.endDate} onChange={e => setField('endDate', e.target.value)} />
            </Field>
            <Field label={t('fieldBudget')}>
              <input className="input" type="number" min="0" value={form.budget} onChange={e => setField('budget', e.target.value)} />
            </Field>
            <Field label={t('fieldCurrency')}>
              <select className="input" value={form.currency} onChange={e => setField('currency', e.target.value)}>
                {['EUR','USD','GBP','AOA','MZN'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={t('fieldTeamSize')}>
              <input className="input" type="number" min="0" value={form.teamSize} onChange={e => setField('teamSize', e.target.value)} />
            </Field>
            <Field label={t('fieldTags')}>
              <input className="input" value={form.tags} onChange={e => setField('tags', e.target.value)} placeholder="ex. bridge,dam,water" />
            </Field>
          </div>
          <Field label={t('fieldDescription')}>
            <textarea className="input textarea" rows={3} value={form.description} onChange={e => setField('description', e.target.value)} />
          </Field>
        </div>

        {/* Geological entries */}
        <GeoSection entries={geoEntries} onChange={setGeoEntries} onFieldChange={setGeoField} />

        {/* Structures */}
        <StructureSection entries={structures} onChange={setStructures} onFieldChange={setStructField} />

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={createProject.isPending}>
            {createProject.isPending ? t('btnSubmitting') : t('btnSubmit')}
          </button>
        </div>
      </form>
    </div>
  )
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
