import { useTranslation } from '../../i18n/context'
import { Field } from './Field'
import { STRUCTURE_TYPES, STRUCT_TYPE_KEY } from '../../constants/structures'

export type StructureFormEntry = {
  label: string
  type: 'bridge' | 'dam' | 'tunnel' | 'retaining_wall' | 'embankment' |
        'building' | 'pipeline' | 'reservoir' | 'culvert' | 'road' | 'other'
  material: string; lengthM: string; heightM: string; spanM: string
  foundationType: string; designLoad: string
  latitude: string; longitude: string; builtAt: string; notes: string
}

function emptyStructure(): StructureFormEntry {
  return {
    label: '', type: 'other', material: '', lengthM: '', heightM: '', spanM: '',
    foundationType: '', designLoad: '', latitude: '', longitude: '', builtAt: '', notes: '',
  }
}

export function StructureSection({ entries, onChange, onFieldChange }: {
  entries: StructureFormEntry[]
  onChange: (fn: (prev: StructureFormEntry[]) => StructureFormEntry[]) => void
  onFieldChange: (i: number, k: keyof StructureFormEntry, v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="form-section">
      <div className="section-heading-row">
        <h2 className="section-heading">{t('sectionStructures')}</h2>
        <button type="button" className="btn-add-structure" onClick={() => onChange(s => [...s, emptyStructure()])}>
          + {t('btnAddStructure')}
        </button>
      </div>
      {entries.map((s, i) => (
        <div key={i} className="geo-form-card geo-form-card--structure">
          <div className="geo-form-header">
            <span className="geo-form-title">#{i + 1} {s.label || '—'}</span>
            <button type="button" className="btn-remove" onClick={() => onChange(e => e.filter((_, j) => j !== i))}>
              {t('btnRemoveStructure')}
            </button>
          </div>
          <div className="form-grid form-grid--3">
            <Field label={t('structFieldLabel')} required>
              <input className="input" value={s.label} onChange={e => onFieldChange(i, 'label', e.target.value)} placeholder="ex. BR-01" />
            </Field>
            <Field label={t('structFieldType')}>
              <select className="input" value={s.type} onChange={e => onFieldChange(i, 'type', e.target.value as StructureFormEntry['type'])}>
                {STRUCTURE_TYPES.map(st => <option key={st} value={st}>{t(STRUCT_TYPE_KEY[st])}</option>)}
              </select>
            </Field>
            <Field label={t('structFieldMaterial')}>
              <input className="input" value={s.material} onChange={e => onFieldChange(i, 'material', e.target.value)} placeholder="ex. reinforced concrete" />
            </Field>
            <Field label={t('structFieldLength')}><input className="input" type="number" step="0.1" value={s.lengthM} onChange={e => onFieldChange(i, 'lengthM', e.target.value)} /></Field>
            <Field label={t('structFieldHeight')}><input className="input" type="number" step="0.1" value={s.heightM} onChange={e => onFieldChange(i, 'heightM', e.target.value)} /></Field>
            <Field label={t('structFieldSpan')}><input className="input" type="number" step="0.1" value={s.spanM} onChange={e => onFieldChange(i, 'spanM', e.target.value)} /></Field>
            <Field label={t('structFieldFoundation')}>
              <input className="input" value={s.foundationType} onChange={e => onFieldChange(i, 'foundationType', e.target.value)} placeholder="ex. piled, raft" />
            </Field>
            <Field label={t('structFieldLoad')}><input className="input" type="number" value={s.designLoad} onChange={e => onFieldChange(i, 'designLoad', e.target.value)} /></Field>
            <Field label={t('structFieldBuilt')}><input className="input" type="date" value={s.builtAt} onChange={e => onFieldChange(i, 'builtAt', e.target.value)} /></Field>
            <Field label={t('structFieldLat')}><input className="input" type="number" step="any" value={s.latitude} onChange={e => onFieldChange(i, 'latitude', e.target.value)} /></Field>
            <Field label={t('structFieldLon')}><input className="input" type="number" step="any" value={s.longitude} onChange={e => onFieldChange(i, 'longitude', e.target.value)} /></Field>
          </div>
          <Field label={t('structFieldNotes')}><textarea className="input textarea" rows={2} value={s.notes} onChange={e => onFieldChange(i, 'notes', e.target.value)} /></Field>
        </div>
      ))}
    </div>
  )
}
