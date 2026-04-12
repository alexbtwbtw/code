import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { db } from '../db/client'

export const companyTeamsRouter = router({

  list: publicProcedure
    .query(() => {
      return db.prepare(`
        SELECT ct.id, ct.name, ct.description, ct.created_at AS createdAt,
               COUNT(ctm.member_id) AS memberCount
        FROM company_teams ct
        LEFT JOIN company_team_members ctm ON ctm.team_id = ct.id
        GROUP BY ct.id
        ORDER BY ct.name
      `).all() as { id: number; name: string; description: string; createdAt: string; memberCount: number }[]
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ input }) => {
      const team = db.prepare(`
        SELECT id, name, description, created_at AS createdAt FROM company_teams WHERE id = ?
      `).get(input.id) as { id: number; name: string; description: string; createdAt: string } | undefined
      if (!team) throw new Error('Team not found')
      const members = db.prepare(`
        SELECT tm.id, tm.name, tm.title
        FROM team_members tm
        JOIN company_team_members ctm ON ctm.member_id = tm.id
        WHERE ctm.team_id = ?
        ORDER BY tm.name
      `).all(input.id) as { id: number; name: string; title: string }[]
      return { ...team, members }
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().default('') }))
    .mutation(({ input }) => {
      const result = db.prepare(`
        INSERT INTO company_teams (name, description) VALUES (?, ?)
      `).run(input.name, input.description)
      return { id: Number(result.lastInsertRowid), name: input.name, description: input.description }
    }),

  update: publicProcedure
    .input(z.object({ id: z.number().int(), name: z.string().min(1), description: z.string().default('') }))
    .mutation(({ input }) => {
      db.prepare(`
        UPDATE company_teams SET name = ?, description = ? WHERE id = ?
      `).run(input.name, input.description, input.id)
      return { id: input.id, name: input.name, description: input.description }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => {
      db.prepare(`DELETE FROM company_teams WHERE id = ?`).run(input.id)
      return { success: true }
    }),

  addMember: publicProcedure
    .input(z.object({ teamId: z.number().int(), memberId: z.number().int() }))
    .mutation(({ input }) => {
      db.prepare(`
        INSERT OR IGNORE INTO company_team_members (team_id, member_id) VALUES (?, ?)
      `).run(input.teamId, input.memberId)
      return { success: true }
    }),

  removeMember: publicProcedure
    .input(z.object({ teamId: z.number().int(), memberId: z.number().int() }))
    .mutation(({ input }) => {
      db.prepare(`
        DELETE FROM company_team_members WHERE team_id = ? AND member_id = ?
      `).run(input.teamId, input.memberId)
      return { success: true }
    }),

  byMember: publicProcedure
    .input(z.object({ memberId: z.number().int() }))
    .query(({ input }) => {
      return db.prepare(`
        SELECT ct.id, ct.name, ct.description
        FROM company_teams ct
        JOIN company_team_members ctm ON ctm.team_id = ct.id
        WHERE ctm.member_id = ?
        ORDER BY ct.name
      `).all(input.memberId) as { id: number; name: string; description: string }[]
    }),
})
