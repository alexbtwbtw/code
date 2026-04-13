import { type RawStructure } from './structures'

// ── Raw DB → camelCase ────────────────────────────────────────────────────────

export type RawMember = {
  id: number; name: string; title: string; email: string
  phone: string; bio: string; role: string; created_at: string; updated_at: string
}

export type RawHistory = {
  id: number; team_member_id: number; project_id: number | null
  project_name: string; macro_region: string; country: string
  place: string; category: string; start_date: string | null; end_date: string | null
  notes: string; created_at: string
}

export type RawHistoryGeo = {
  id: number; history_id: number; point_label: string; type: string
  macro_region: string; country: string; place: string
  depth: number | null; soil_type: string; rock_type: string
  groundwater_depth: number | null; bearing_capacity: number | null
  spt_n_value: number | null; seismic_class: string
  latitude: number | null; longitude: number | null
  sampled_at: string | null; notes: string; created_at: string
}

export type RawHistoryStructure = RawStructure & { history_id: number }

export type RawHistoryFeature = {
  id: number; history_id: number; label: string; description: string
  macro_region: string; country: string; place: string
  latitude: number | null; longitude: number | null; notes: string; created_at: string
}

export type RawCv = {
  id: number; team_member_id: number; filename: string; file_size: number; uploaded_at: string
}

// ── Mappers ───────────────────────────────────────────────────────────────────

export function mapMember(r: RawMember) {
  return { id: r.id, name: r.name, title: r.title, email: r.email, phone: r.phone, bio: r.bio, role: r.role as 'user' | 'finance' | 'oversight' | 'manager' | 'admin', createdAt: r.created_at, updatedAt: r.updated_at }
}

export function mapHistory(r: RawHistory) {
  return { id: r.id, teamMemberId: r.team_member_id, projectId: r.project_id, projectName: r.project_name, macroRegion: r.macro_region, country: r.country, place: r.place, category: r.category, startDate: r.start_date, endDate: r.end_date, notes: r.notes, createdAt: r.created_at }
}

export function mapHistoryGeo(r: RawHistoryGeo) {
  return { id: r.id, historyId: r.history_id, pointLabel: r.point_label, type: r.type, macroRegion: r.macro_region, country: r.country, place: r.place, depth: r.depth, soilType: r.soil_type, rockType: r.rock_type, groundwaterDepth: r.groundwater_depth, bearingCapacity: r.bearing_capacity, sptNValue: r.spt_n_value, seismicClass: r.seismic_class, latitude: r.latitude, longitude: r.longitude, sampledAt: r.sampled_at, notes: r.notes, createdAt: r.created_at }
}

export function mapHistoryStructure(r: RawHistoryStructure) {
  return { id: r.id, historyId: r.history_id, label: r.label, type: r.type, material: r.material, macroRegion: r.macro_region, country: r.country, place: r.place, lengthM: r.length_m, heightM: r.height_m, spanM: r.span_m, foundationType: r.foundation_type, designLoad: r.design_load, latitude: r.latitude, longitude: r.longitude, builtAt: r.built_at, notes: r.notes, createdAt: r.created_at }
}

export function mapHistoryFeature(r: RawHistoryFeature) {
  return { id: r.id, historyId: r.history_id, label: r.label, description: r.description, macroRegion: r.macro_region, country: r.country, place: r.place, latitude: r.latitude, longitude: r.longitude, notes: r.notes, createdAt: r.created_at }
}
