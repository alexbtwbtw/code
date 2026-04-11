// ── Raw DB → camelCase ────────────────────────────────────────────────────────

export const STRUCTURE_TYPES = ['bridge', 'dam', 'tunnel', 'retaining_wall', 'embankment',
  'building', 'pipeline', 'reservoir', 'culvert', 'road', 'other'] as const

export type RawStructure = {
  id: number; project_id: number; label: string; type: string; material: string
  macro_region: string; country: string; place: string
  length_m: number | null; height_m: number | null; span_m: number | null
  foundation_type: string; design_load: number | null
  latitude: number | null; longitude: number | null
  built_at: string | null; notes: string; created_at: string
}

export function mapStructure(r: RawStructure) {
  return {
    id: r.id, projectId: r.project_id, label: r.label, type: r.type, material: r.material,
    macroRegion: r.macro_region, country: r.country, place: r.place,
    lengthM: r.length_m, heightM: r.height_m, spanM: r.span_m,
    foundationType: r.foundation_type, designLoad: r.design_load,
    latitude: r.latitude, longitude: r.longitude,
    builtAt: r.built_at, notes: r.notes, createdAt: r.created_at,
  }
}
