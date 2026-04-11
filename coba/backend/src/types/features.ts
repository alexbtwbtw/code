// ── Raw DB → camelCase ────────────────────────────────────────────────────────

export type RawFeature = {
  id: number; project_id: number; label: string; description: string
  macro_region: string; country: string; place: string
  latitude: number | null; longitude: number | null; notes: string; created_at: string
}

export function mapFeature(r: RawFeature) {
  return {
    id: r.id, projectId: r.project_id, label: r.label, description: r.description,
    macroRegion: r.macro_region, country: r.country, place: r.place,
    latitude: r.latitude, longitude: r.longitude, notes: r.notes, createdAt: r.created_at,
  }
}
