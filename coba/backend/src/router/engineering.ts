import { z } from 'zod'
import { router, publicProcedure, authedProcedure } from '../trpc'
import { db } from '../db'

interface RawDwgFile {
  id: number
  project_id: number | null
  file_name: string
  dxf_content: string | null
  version: string | null
  status: string
  error_msg: string | null
  file_size: number
  uploaded_at: string
}

function mapDwgFile(row: RawDwgFile) {
  return {
    id:         row.id,
    projectId:  row.project_id,
    fileName:   row.file_name,
    version:    row.version,
    status:     row.status,
    errorMsg:   row.error_msg,
    fileSize:   row.file_size,
    uploadedAt: row.uploaded_at,
  }
}

export const engineeringRouter = router({
  list: publicProcedure.query(() => {
    const rows = db.prepare(`
      SELECT id, project_id, file_name, dxf_content, version, status, error_msg, file_size, uploaded_at
      FROM dwg_files
      ORDER BY uploaded_at DESC
    `).all() as RawDwgFile[]
    return rows.map(mapDwgFile)
  }),

  byProject: publicProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => {
      const rows = db.prepare(`
        SELECT id, project_id, file_name, dxf_content, version, status, error_msg, file_size, uploaded_at
        FROM dwg_files
        WHERE project_id = ?
        ORDER BY uploaded_at DESC
      `).all(input.projectId) as RawDwgFile[]
      return rows.map(mapDwgFile)
    }),

  getDxf: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => {
      const row = db.prepare(`
        SELECT dxf_content, status, error_msg FROM dwg_files WHERE id = ?
      `).get(input.id) as { dxf_content: string | null; status: string; error_msg: string | null } | undefined
      if (!row) return null
      return {
        dxfContent: row.dxf_content,
        status:     row.status,
        errorMsg:   row.error_msg,
      }
    }),

  delete: authedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => {
      db.prepare(`DELETE FROM dwg_files WHERE id = ?`).run(input.id)
      return { success: true }
    }),
})
