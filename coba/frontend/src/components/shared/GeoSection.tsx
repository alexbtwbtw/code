import { useTranslation } from '../../i18n/context'
import { Field } from './Field'

export type GeoFormEntry = {
  pointLabel: string
  type: 'borehole' | 'trial_pit' | 'core_sample' | 'field_survey'
  depth: string; soilType: string; rockType: string
  groundwaterDepth: string; bearingCapacity: string; sptNValue: string
  seismicClass: string; latitude: string; longitude: string
  sampledAt: string; notes: string
}

function emptyGeo(): GeoFormEntry {
  return {
    pointLabel: '', type: 'borehole', depth: '', soilType: '', rockType: '',
    groundwaterDepth: '', bearingCapacity: '', sptNValue: '', seismicClass: '',
    latitude: '', longitude: '', sampledAt: '', notes: '',
  }
}

export function GeoSection({ entries, onChange, onFieldChange }: {
  entries: GeoFormEntry[]
  onChange: (fn: (prev: GeoFormEntry[]) => GeoFormEntry[]) => void
  onFieldChange: (i: number, k: keyof GeoFormEntry, v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="form-section">
      <div className="section-heading-row">
        <h2 className="section-heading">{t('sectionGeo')}</h2>
        <button type="button" className="btn-add-geo" onClick={() => onChange(g => [...g, emptyGeo()])}>
          + {t('btnAddGeo')}
        </button>
      </div>
      {entries.map((g, i) => (
        <div key={i} className="geo-form-card">
          <div className="geo-form-header">
            <span className="geo-form-title">#{i + 1} {g.pointLabel || '—'}</span>
            <button type="button" className="btn-remove" onClick={() => onChange(e => e.filter((_, j) => j !== i))}>
              {t('btnRemoveGeo')}
            </button>
          </div>
          <div className="form-grid form-grid--3">
            <Field label={t('geoFieldLabel')} required>
              <input className="input" value={g.pointLabel} onChange={e => onFieldChange(i, 'pointLabel', e.target.value)} placeholder="ex. BH-01" />
            </Field>
            <Field label={t('geoFieldType')}>
              <select className="input" value={g.type} onChange={e => onFieldChange(i, 'type', e.target.value as GeoFormEntry['type'])}>
                <option value="borehole">{t('geoTypeBorehole')}</option>
                <option value="trial_pit">{t('geoTypeTrialPit')}</option>
                <option value="core_sample">{t('geoTypeCore')}</option>
                <option value="field_survey">{t('geoTypeSurvey')}</option>
              </select>
            </Field>
            <Field label={t('geoFieldDepth')}><input className="input" type="number" step="0.1" value={g.depth} onChange={e => onFieldChange(i, 'depth', e.target.value)} /></Field>
            <Field label={t('geoFieldSoil')}><input className="input" value={g.soilType} onChange={e => onFieldChange(i, 'soilType', e.target.value)} /></Field>
            <Field label={t('geoFieldRock')}><input className="input" value={g.rockType} onChange={e => onFieldChange(i, 'rockType', e.target.value)} /></Field>
            <Field label={t('geoFieldGW')}><input className="input" type="number" step="0.1" value={g.groundwaterDepth} onChange={e => onFieldChange(i, 'groundwaterDepth', e.target.value)} /></Field>
            <Field label={t('geoFieldBC')}><input className="input" type="number" value={g.bearingCapacity} onChange={e => onFieldChange(i, 'bearingCapacity', e.target.value)} /></Field>
            <Field label={t('geoFieldSPT')}><input className="input" type="number" value={g.sptNValue} onChange={e => onFieldChange(i, 'sptNValue', e.target.value)} /></Field>
            <Field label={t('geoFieldSeismic')}><input className="input" value={g.seismicClass} onChange={e => onFieldChange(i, 'seismicClass', e.target.value)} placeholder="A–E" /></Field>
            <Field label={t('geoFieldLat')}><input className="input" type="number" step="any" value={g.latitude} onChange={e => onFieldChange(i, 'latitude', e.target.value)} /></Field>
            <Field label={t('geoFieldLon')}><input className="input" type="number" step="any" value={g.longitude} onChange={e => onFieldChange(i, 'longitude', e.target.value)} /></Field>
            <Field label={t('geoFieldSampled')}><input className="input" type="date" value={g.sampledAt} onChange={e => onFieldChange(i, 'sampledAt', e.target.value)} /></Field>
          </div>
          <Field label={t('geoFieldNotes')}><textarea className="input textarea" rows={2} value={g.notes} onChange={e => onFieldChange(i, 'notes', e.target.value)} /></Field>
        </div>
      ))}
    </div>
  )
}
