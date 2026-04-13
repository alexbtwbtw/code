import { z } from 'zod'
import { router, publicProcedure, authedProcedure } from '../trpc'
import { db } from '../db'

interface RawDwgFile {
  id: number
  project_id: number | null
  file_name: string
  display_name: string
  notes: string
  dwg_version: string | null
  file_size: number
  uploaded_at: string
}

function mapDwgFile(row: RawDwgFile) {
  return {
    id:          row.id,
    projectId:   row.project_id,
    fileName:    row.file_name,
    displayName: row.display_name,
    notes:       row.notes,
    dwgVersion:  row.dwg_version,
    fileSize:    row.file_size,
    uploadedAt:  row.uploaded_at,
  }
}

const LIST_SQL = `
  SELECT id, project_id, file_name, display_name, notes, dwg_version, file_size, uploaded_at
  FROM dwg_files
  ORDER BY uploaded_at DESC
`

export const engineeringRouter = router({
  list: publicProcedure.query(() => {
    const rows = db.prepare(LIST_SQL).all() as RawDwgFile[]
    return rows.map(mapDwgFile)
  }),

  byProject: publicProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => {
      const rows = db.prepare(`
        SELECT id, project_id, file_name, display_name, notes, dwg_version, file_size, uploaded_at
        FROM dwg_files
        WHERE project_id = ?
        ORDER BY uploaded_at DESC
      `).all(input.projectId) as RawDwgFile[]
      return rows.map(mapDwgFile)
    }),

  update: authedProcedure
    .input(z.object({
      id:          z.number().int(),
      displayName: z.string().min(1).optional(),
      notes:       z.string().optional(),
    }))
    .mutation(({ input }) => {
      const sets: string[] = []
      const vals: unknown[] = []

      if (input.displayName !== undefined) { sets.push('display_name = ?'); vals.push(input.displayName) }
      if (input.notes       !== undefined) { sets.push('notes = ?');        vals.push(input.notes) }

      if (sets.length === 0) return { success: true }

      vals.push(input.id)
      db.prepare(`UPDATE dwg_files SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
      return { success: true }
    }),

  delete: authedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => {
      db.prepare(`DELETE FROM dwg_files WHERE id = ?`).run(input.id)
      return { success: true }
    }),
})
