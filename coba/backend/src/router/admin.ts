import { z } from 'zod/v4'
import { router, publicProcedure } from '../trpc'
import { db } from '../db'
import { seedProjects } from '../seed/projects'
import { seedTeam } from '../seed/team'
import { seedRequirements } from '../seed/requirements'
import { seedTasks } from '../seed/tasks'

const ADMIN_KEY = process.env.ADMIN_KEY ?? 'dev-admin'

export const adminRouter = router({
  reseed: publicProcedure
    .input(z.object({ adminKey: z.string() }))
    .mutation(async ({ input }) => {
      if (input.adminKey !== ADMIN_KEY) {
        throw new Error('Unauthorized: invalid admin key')
      }

      // Delete all rows in reverse dependency order
      db.exec(`
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
      `)

      // Re-seed
      seedProjects()
      await seedTeam()
      seedRequirements()
      seedTasks()

      return { ok: true, message: 'Database re-seeded successfully' }
    }),
})
