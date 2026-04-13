import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { db } from '../db'

interface RawTimeEntry {
  id: number
  project_id: number
  member_id: number
  date: string
  hours: number
  description: string
  created_at: string
}

interface RawTimeEntryWithMember extends RawTimeEntry {
  member_name: string
}

interface RawTimeEntryWithProject extends RawTimeEntry {
  project_name: string
}

function mapEntry(row: RawTimeEntryWithMember) {
  return {
    id: row.id,
    projectId: row.project_id,
    memberId: row.member_id,
    memberName: row.member_name,
    date: row.date,
    hours: row.hours,
    description: row.description,
    createdAt: row.created_at,
  }
}

function mapEntryWithProject(row: RawTimeEntryWithProject) {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    memberId: row.member_id,
    date: row.date,
    hours: row.hours,
    description: row.description,
    createdAt: row.created_at,
  }
}

export const timeEntriesRouter = router({
  byProject: publicProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => {
      const rows = db.prepare(`
        SELECT te.*, tm.name as member_name
        FROM time_entries te
        JOIN team_members tm ON tm.id = te.member_id
        WHERE te.project_id = ?
        ORDER BY te.date DESC, te.created_at DESC
      `).all(input.projectId) as RawTimeEntryWithMember[]
      return rows.map(mapEntry)
    }),

  byMember: publicProcedure
    .input(z.object({ memberId: z.number().int() }))
    .query(({ input }) => {
      const rows = db.prepare(`
        SELECT te.*, p.name as project_name
        FROM time_entries te
        JOIN projects p ON p.id = te.project_id
        WHERE te.member_id = ?
        ORDER BY te.date DESC, te.created_at DESC
      `).all(input.memberId) as RawTimeEntryWithProject[]
      return rows.map(mapEntryWithProject)
    }),

  create: publicProcedure
    .input(z.object({
      projectId: z.number().int(),
      memberId: z.number().int(),
      date: z.string().min(1),
      hours: z.number().positive(),
      description: z.string().default(''),
    }))
    .mutation(({ input }) => {
      const result = db.prepare(`
        INSERT INTO time_entries (project_id, member_id, date, hours, description)
        VALUES (?, ?, ?, ?, ?)
      `).run(input.projectId, input.memberId, input.date, input.hours, input.description)
      const row = db.prepare(`
        SELECT te.*, tm.name as member_name
        FROM time_entries te
        JOIN team_members tm ON tm.id = te.member_id
        WHERE te.id = ?
      `).get(result.lastInsertRowid) as RawTimeEntryWithMember
      return mapEntry(row)
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => {
      db.prepare(`DELETE FROM time_entries WHERE id = ?`).run(input.id)
      return { success: true }
    }),

  report: publicProcedure
    .query(() => {
      interface ByProjectRow {
        project_id: number
        project_name: string
        total_hours: number
        entry_count: number
        member_count: number
      }
      interface ByMemberRow {
        member_id: number
        member_name: string
        total_hours: number
        project_count: number
        entry_count: number
      }
      interface UnderreportingRow {
        member_id: number
        member_name: string
        project_count: number
      }

      const byProjectRows = db.prepare(`
        SELECT
          p.id        AS project_id,
          p.name      AS project_name,
          COALESCE(SUM(te.hours), 0)          AS total_hours,
          COALESCE(COUNT(te.id), 0)           AS entry_count,
          COALESCE(COUNT(DISTINCT te.member_id), 0) AS member_count
        FROM projects p
        LEFT JOIN time_entries te ON te.project_id = p.id
        GROUP BY p.id, p.name
        HAVING total_hours > 0
        ORDER BY total_hours DESC
      `).all() as ByProjectRow[]

      const byMemberRows = db.prepare(`
        SELECT
          tm.id       AS member_id,
          tm.name     AS member_name,
          COALESCE(SUM(te.hours), 0)           AS total_hours,
          COALESCE(COUNT(DISTINCT te.project_id), 0) AS project_count,
          COALESCE(COUNT(te.id), 0)            AS entry_count
        FROM team_members tm
        LEFT JOIN time_entries te ON te.member_id = tm.id
        GROUP BY tm.id, tm.name
        HAVING total_hours > 0
        ORDER BY total_hours DESC
      `).all() as ByMemberRow[]

      const underreportingRows = db.prepare(`
        SELECT
          tm.id   AS member_id,
          tm.name AS member_name,
          COUNT(DISTINCT pt.project_id) AS project_count
        FROM team_members tm
        JOIN project_team pt ON pt.team_member_id = tm.id
        WHERE NOT EXISTS (
          SELECT 1 FROM time_entries te
          WHERE te.member_id = tm.id
        )
        GROUP BY tm.id, tm.name
        ORDER BY project_count DESC
      `).all() as UnderreportingRow[]

      return {
        byProject: byProjectRows.map(r => ({
          projectId:   r.project_id,
          projectName: r.project_name,
          totalHours:  r.total_hours,
          entryCount:  r.entry_count,
          memberCount: r.member_count,
        })),
        byMember: byMemberRows.map(r => ({
          memberId:     r.member_id,
          memberName:   r.member_name,
          totalHours:   r.total_hours,
          projectCount: r.project_count,
          entryCount:   r.entry_count,
        })),
        underreporting: underreportingRows.map(r => ({
          memberId:     r.member_id,
          memberName:   r.member_name,
          projectCount: r.project_count,
        })),
      }
    }),
})
