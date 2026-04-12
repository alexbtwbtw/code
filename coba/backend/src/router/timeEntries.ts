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
})
