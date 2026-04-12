// ── Raw DB → camelCase ────────────────────────────────────────────────────────

export type RawProject = {
  id: number
  ref_code: string
  name: string
  client: string
  macro_region: string
  country: string
  place: string
  category: string
  status: string
  priority: string
  start_date: string | null
  end_date: string | null
  budget: number | null
  currency: string
  project_manager: string
  team_size: number
  description: string
  tags: string
  created_at: string
  updated_at: string
  total_hours?: number
}

export function mapProject(r: RawProject) {
  return {
    id: r.id,
    refCode: r.ref_code,
    name: r.name,
    client: r.client,
    macroRegion: r.macro_region,
    country: r.country,
    place: r.place,
    category: r.category,
    status: r.status,
    priority: r.priority,
    startDate: r.start_date,
    endDate: r.end_date,
    budget: r.budget,
    currency: r.currency,
    projectManager: r.project_manager,
    teamSize: r.team_size,
    description: r.description,
    tags: r.tags,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    totalHours: r.total_hours ?? 0,
  }
}
