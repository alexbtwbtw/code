import { router, adminProcedure } from '../trpc'
import { db } from '../db'
import { seedProjects } from '../seed/projects'
import { seedTeam } from '../seed/team'
import { seedRequirements } from '../seed/requirements'
import { seedTasks } from '../seed/tasks'
import { seedCompanyTeams } from '../seed/companyTeams'
import { seedTimeEntries } from '../seed/timeEntries'
import { seedFinance } from '../seed/finance'
import { selectRecentAuditLog } from '../db/statements/audit'

const WIPE_SQL = `
  DELETE FROM audit_log;
  DELETE FROM project_fixed_costs;
  DELETE FROM member_rates;
  DELETE FROM company_team_members;
  DELETE FROM company_teams;
  DELETE FROM time_entries;
  DELETE FROM task_comments;
  DELETE FROM task_assignments;
  DELETE FROM tasks;
  DELETE FROM requirement_assignments;
  DELETE FROM requirements;
  DELETE FROM requirement_books;
  DELETE FROM member_history_features;
  DELETE FROM member_history_structures;
  DELETE FROM member_history_geo;
  DELETE FROM member_history;
  DELETE FROM project_team;
  DELETE FROM member_cvs;
  DELETE FROM project_features;
  DELETE FROM structures;
  DELETE FROM geo_entries;
  DELETE FROM projects;
  DELETE FROM team_members;
  DELETE FROM sqlite_sequence;
`

export const adminRouter = router({
  reseed: adminProcedure
    .mutation(async () => {
      db.exec(WIPE_SQL)

      // Re-seed — each function runs in its own db.transaction(), so a failure
      // inside any of them will throw synchronously and propagate as a tRPC error.
      try {
        seedProjects()
        await seedTeam()
        seedRequirements()
        seedTasks()
        seedCompanyTeams()
        seedTimeEntries()
        seedFinance()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(`Reseed failed: ${msg}`)
      }

      return { ok: true, message: 'Database re-seeded successfully' }
    }),

  wipe: adminProcedure
    .mutation(() => {
      db.exec(WIPE_SQL)
      return { success: true }
    }),

  getAuditLog: adminProcedure
    .query(() => {
      const rows = selectRecentAuditLog.all() as {
        id: number
        user_id: number | null
        user_name: string | null
        action: string
        entity: string
        entity_id: number | null
        changes: string | null
        created_at: string
      }[]
      return rows.map(r => ({
        id:        r.id,
        userId:    r.user_id,
        userName:  r.user_name,
        action:    r.action,
        entity:    r.entity,
        entityId:  r.entity_id,
        changes:   r.changes ? JSON.parse(r.changes) : null,
        createdAt: r.created_at,
      }))
    }),
})
