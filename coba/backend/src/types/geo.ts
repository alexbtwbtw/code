// ── Raw DB → camelCase ────────────────────────────────────────────────────────

export type RawGeo = {
  id: number; project_id: number; point_label: string; type: string
  macro_region: string; country: string; place: string
  depth: number | null; soil_type: string; rock_type: string
  groundwater_depth: number | null; bearing_capacity: number | null
  spt_n_value: number | null; seismic_class: string
  latitude: number | null; longitude: number | null
  sampled_at: string | null; notes: string; created_at: string
}

export function mapGeo(r: RawGeo) {
  return {
    id: r.id, projectId: r.project_id, pointLabel: r.point_label, type: r.type,
    macroRegion: r.macro_region, country: r.country, place: r.place,
    depth: r.depth, soilType: r.soil_type, rockType: r.rock_type,
    groundwaterDepth: r.groundwater_depth, bearingCapacity: r.bearing_capacity,
    sptNValue: r.spt_n_value, seismicClass: r.seismic_class,
    latitude: r.latitude, longitude: r.longitude,
    sampledAt: r.sampled_at, notes: r.notes, createdAt: r.created_at,
  }
}
