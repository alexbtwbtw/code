import { z } from 'zod'
import { router, authedProcedure, managerProcedure } from '../trpc'
import { db } from '../db/client'
import { logAudit } from '../services/audit'

export const companyTeamsRouter = router({

  list: authedProcedure
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

  byId: authedProcedure
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

  create: managerProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().default('') }))
    .mutation(({ ctx, input }) => {
      const result = db.prepare(`
        INSERT INTO company_teams (name, description) VALUES (?, ?)
      `).run(input.name, input.description)
      const id = Number(result.lastInsertRowid)
      logAudit(ctx.userId, ctx.userName, 'create', 'company_teams', id)
      return { id, name: input.name, description: input.description }
    }),

  update: managerProcedure
    .input(z.object({ id: z.number().int(), name: z.string().min(1), description: z.string().default('') }))
    .mutation(({ ctx, input }) => {
      db.prepare(`
        UPDATE company_teams SET name = ?, description = ? WHERE id = ?
      `).run(input.name, input.description, input.id)
      logAudit(ctx.userId, ctx.userName, 'update', 'company_teams', input.id)
      return { id: input.id, name: input.name, description: input.description }
    }),

  delete: managerProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      db.prepare(`DELETE FROM company_teams WHERE id = ?`).run(input.id)
      logAudit(ctx.userId, ctx.userName, 'delete', 'company_teams', input.id)
      return { success: true }
    }),

  addMember: managerProcedure
    .input(z.object({ teamId: z.number().int(), memberId: z.number().int() }))
    .mutation(({ ctx, input }) => {
      db.prepare(`
        INSERT OR IGNORE INTO company_team_members (team_id, member_id) VALUES (?, ?)
      `).run(input.teamId, input.memberId)
      logAudit(ctx.userId, ctx.userName, 'create', 'company_team_members', input.teamId)
      return { success: true }
    }),

  removeMember: managerProcedure
    .input(z.object({ teamId: z.number().int(), memberId: z.number().int() }))
    .mutation(({ ctx, input }) => {
      db.prepare(`
        DELETE FROM company_team_members WHERE team_id = ? AND member_id = ?
      `).run(input.teamId, input.memberId)
      logAudit(ctx.userId, ctx.userName, 'delete', 'company_team_members', input.teamId)
      return { success: true }
    }),

  byMember: authedProcedure
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
