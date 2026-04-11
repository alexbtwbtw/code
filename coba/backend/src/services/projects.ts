import { db } from '../db'
import { type RawProject, mapProject } from '../types/projects'
import type { z } from 'zod'
import type { CreateProjectSchema } from '../schemas/projects'

export function listProjects(input: {
  search: string
  status: string
  category: string
  country: string
  sortBy: 'relevance' | 'newest' | 'budget' | 'priority'
}) {
  let sql = `
    SELECT DISTINCT p.*
    FROM projects p
    LEFT JOIN geo_entries g ON g.project_id = p.id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (input.search) {
    sql += ` AND (
      p.name           LIKE ? OR
      p.ref_code       LIKE ? OR
      p.client         LIKE ? OR
      p.description    LIKE ? OR
      p.tags           LIKE ? OR
      p.place          LIKE ? OR
      p.macro_region   LIKE ? OR
      g.soil_type      LIKE ? OR
      g.rock_type      LIKE ? OR
      g.type           LIKE ? OR
      g.point_label    LIKE ? OR
      g.notes          LIKE ?
    )`
    const like = `%${input.search}%`
    params.push(like, like, like, like, like, like, like, like, like, like, like, like)
  }
  if (input.status) {
    const statuses = input.status.split(',')
    sql += ` AND p.status IN (${statuses.map(() => '?').join(',')})`
    params.push(...statuses)
  }
  if (input.category) { sql += ` AND p.category = ?`;        params.push(input.category) }
  if (input.country)  { sql += ` AND p.country LIKE ?`;      params.push(`%${input.country}%`) }

  if (input.sortBy === 'budget') {
    sql += ` ORDER BY p.budget DESC NULLS LAST`
  } else if (input.sortBy === 'newest') {
    sql += ` ORDER BY p.start_date DESC NULLS LAST`
  } else if (input.sortBy === 'priority') {
    sql += `
      ORDER BY
        CASE p.priority
          WHEN 'critical'  THEN 1
          WHEN 'very_high' THEN 2
          WHEN 'high'      THEN 3
          WHEN 'medium'    THEN 4
          WHEN 'low'       THEN 5
          WHEN 'very_low'  THEN 6
          WHEN 'minimal'   THEN 7
          ELSE 8
        END ASC,
        p.start_date DESC NULLS LAST`
  } else {
    sql += `
      ORDER BY
        CASE p.status
          WHEN 'active'    THEN 1
          WHEN 'planning'  THEN 2
          WHEN 'suspended' THEN 3
          WHEN 'cancelled' THEN 4
          WHEN 'completed' THEN 5
          ELSE 6
        END ASC,
        p.start_date DESC NULLS LAST`
  }

  const rows = db.prepare(sql).all(...params) as RawProject[]
  return rows.map(mapProject)
}

export function getProjectById(id: number) {
  const row = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as RawProject | undefined
  if (!row) throw new Error(`Project ${id} not found`)
  return mapProject(row)
}

export function createProject(input: z.infer<typeof CreateProjectSchema>) {
  const result = db.prepare(`
    INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority,
      start_date, end_date, budget, currency, project_manager, team_size, description, tags)
    VALUES (@ref_code, @name, @client, @macro_region, @country, @place, @category, @status, @priority,
      @start_date, @end_date, @budget, @currency, @project_manager, @team_size, @description, @tags)
  `).run({
    ref_code: input.refCode,
    name: input.name,
    client: input.client,
    macro_region: input.macroRegion,
    country: input.country,
    place: input.place,
    category: input.category,
    status: input.status,
    priority: input.priority,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    budget: input.budget ?? null,
    currency: input.currency,
    project_manager: input.projectManager,
    team_size: input.teamSize,
    description: input.description,
    tags: input.tags,
  })
  const row = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(result.lastInsertRowid) as RawProject
  return mapProject(row)
}

export function updateProject(input: Partial<z.infer<typeof CreateProjectSchema>> & { id: number }) {
  const { id, ...rest } = input
  db.prepare(`
    UPDATE projects SET
      ref_code        = COALESCE(@ref_code, ref_code),
      name            = COALESCE(@name, name),
      client          = COALESCE(@client, client),
      macro_region    = COALESCE(@macro_region, macro_region),
      country         = COALESCE(@country, country),
      place           = COALESCE(@place, place),
      category        = COALESCE(@category, category),
      status          = COALESCE(@status, status),
      priority        = COALESCE(@priority, priority),
      start_date      = COALESCE(@start_date, start_date),
      end_date        = COALESCE(@end_date, end_date),
      budget          = COALESCE(@budget, budget),
      currency        = COALESCE(@currency, currency),
      project_manager = COALESCE(@project_manager, project_manager),
      team_size       = COALESCE(@team_size, team_size),
      description     = COALESCE(@description, description),
      tags            = COALESCE(@tags, tags),
      updated_at      = datetime('now')
    WHERE id = @id
  `).run({
    id,
    ref_code: rest.refCode ?? null,
    name: rest.name ?? null,
    client: rest.client ?? null,
    macro_region: rest.macroRegion ?? null,
    country: rest.country ?? null,
    place: rest.place ?? null,
    category: rest.category ?? null,
    status: rest.status ?? null,
    priority: rest.priority ?? null,
    start_date: rest.startDate ?? null,
    end_date: rest.endDate ?? null,
    budget: rest.budget ?? null,
    currency: rest.currency ?? null,
    project_manager: rest.projectManager ?? null,
    team_size: rest.teamSize ?? null,
    description: rest.description ?? null,
    tags: rest.tags ?? null,
  })
  const row = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id) as RawProject
  return mapProject(row)
}

export function getProjectStats(filterStatus?: string) {
  if (filterStatus) {
    const total = (db.prepare(`SELECT COUNT(*) as n FROM projects WHERE status = ?`).get(filterStatus) as { n: number }).n
    const byStatus   = db.prepare(`SELECT status, COUNT(*) as n FROM projects WHERE status = ? GROUP BY status`).all(filterStatus) as { status: string; n: number }[]
    const byCategory = db.prepare(`SELECT category, COUNT(*) as n FROM projects WHERE status = ? GROUP BY category`).all(filterStatus) as { category: string; n: number }[]
    const byCountry  = db.prepare(`SELECT country, COUNT(*) as n FROM projects WHERE status = ? GROUP BY country ORDER BY n DESC LIMIT 10`).all(filterStatus) as { country: string; n: number }[]
    const byYear     = db.prepare(`
      SELECT strftime('%Y', start_date) as year, COUNT(*) as n
      FROM projects WHERE start_date IS NOT NULL AND status = ?
      GROUP BY year ORDER BY year DESC
    `).all(filterStatus) as { year: string; n: number }[]
    const totalBudget = (db.prepare(`SELECT SUM(budget) as total FROM projects WHERE currency = 'EUR' AND status = ?`).get(filterStatus) as { total: number | null }).total ?? 0
    return { total, byStatus, byCategory, byCountry, byYear, totalBudget }
  }
  const total = (db.prepare(`SELECT COUNT(*) as n FROM projects`).get() as { n: number }).n
  const byStatus   = db.prepare(`SELECT status, COUNT(*) as n FROM projects GROUP BY status`).all() as { status: string; n: number }[]
  const byCategory = db.prepare(`SELECT category, COUNT(*) as n FROM projects GROUP BY category`).all() as { category: string; n: number }[]
  const byCountry  = db.prepare(`SELECT country, COUNT(*) as n FROM projects GROUP BY country ORDER BY n DESC LIMIT 10`).all() as { country: string; n: number }[]
  const byYear     = db.prepare(`
    SELECT strftime('%Y', start_date) as year, COUNT(*) as n
    FROM projects WHERE start_date IS NOT NULL
    GROUP BY year ORDER BY year DESC
  `).all() as { year: string; n: number }[]
  const totalBudget = (db.prepare(`SELECT SUM(budget) as total FROM projects WHERE currency = 'EUR'`).get() as { total: number | null }).total ?? 0
  return { total, byStatus, byCategory, byCountry, byYear, totalBudget }
}

export function getMyProjects(memberId: number) {
  const rows = db.prepare(`
    SELECT DISTINCT p.* FROM projects p
    JOIN project_team pt ON pt.project_id = p.id
    WHERE pt.team_member_id = ?
    ORDER BY p.created_at DESC
  `).all(memberId) as RawProject[]
  return rows.map(mapProject)
}

export function getPriorityList() {
  const today = new Date().toISOString().slice(0, 10)

  const projects = db.prepare(`
    SELECT
      p.id, p.ref_code, p.name, p.status, p.priority,
      p.project_manager, p.budget, p.currency, p.country
    FROM projects p
    WHERE p.status = 'active'
    ORDER BY CASE p.priority
      WHEN 'critical'  THEN 1
      WHEN 'very_high' THEN 2
      WHEN 'high'      THEN 3
      WHEN 'medium'    THEN 4
      WHEN 'low'       THEN 5
      WHEN 'very_low'  THEN 6
      WHEN 'minimal'   THEN 7
      ELSE 8
    END
  `).all() as {
    id: number; ref_code: string; name: string; status: string; priority: string;
    project_manager: string | null; budget: number | null; currency: string | null; country: string | null
  }[]

  const taskCounts = db.prepare(`
    SELECT
      project_id,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done'        THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'blocked'     THEN 1 ELSE 0 END) as blocked,
      SUM(CASE WHEN status != 'done' AND due_date < ? THEN 1 ELSE 0 END) as overdue
    FROM tasks
    GROUP BY project_id
  `).all(today) as {
    project_id: number; total: number; done: number;
    in_progress: number; blocked: number; overdue: number
  }[]

  const taskMap = new Map(taskCounts.map(r => [r.project_id, r]))

  return projects.map(p => {
    const t = taskMap.get(p.id)
    return {
      id: p.id,
      refCode: p.ref_code,
      name: p.name,
      status: p.status,
      priority: p.priority,
      projectManager: p.project_manager ?? null,
      budget: p.budget ?? null,
      currency: p.currency ?? null,
      country: p.country ?? null,
      totalTasks: t?.total ?? 0,
      doneTasks: t?.done ?? 0,
      inProgressTasks: t?.in_progress ?? 0,
      blockedTasks: t?.blocked ?? 0,
      overdueTasks: t?.overdue ?? 0,
    }
  })
}

export function getRiskSummary() {
  const today = new Date().toISOString().slice(0, 10)
  const overdue = db.prepare(`
    SELECT project_id, COUNT(*) as cnt FROM tasks
    WHERE due_date < ? AND status != 'done' GROUP BY project_id
  `).all(today) as { project_id: number; cnt: number }[]
  const blocked = db.prepare(`
    SELECT project_id, COUNT(*) as cnt FROM tasks
    WHERE status = 'blocked' GROUP BY project_id
  `).all() as { project_id: number; cnt: number }[]

  const map: Record<number, { overdueCount: number; blockedCount: number }> = {}
  for (const r of overdue) map[r.project_id] = { overdueCount: r.cnt, blockedCount: 0 }
  for (const r of blocked) {
    if (!map[r.project_id]) map[r.project_id] = { overdueCount: 0, blockedCount: 0 }
    map[r.project_id].blockedCount = r.cnt
  }
  return map
}
