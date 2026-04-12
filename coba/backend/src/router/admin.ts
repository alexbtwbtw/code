import { router, publicProcedure } from '../trpc'
import { db } from '../db'
import { seedProjects } from '../seed/projects'
import { seedTeam } from '../seed/team'
import { seedRequirements } from '../seed/requirements'
import { seedTasks } from '../seed/tasks'
import { seedCompanyTeams } from '../seed/companyTeams'
import { seedTimeEntries } from '../seed/timeEntries'

export const adminRouter = router({
  reseed: publicProcedure
    .mutation(async () => {
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
        DELETE FROM sqlite_sequence;
      `)

      // Re-seed
      seedProjects()
      await seedTeam()
      seedRequirements()
      seedTasks()
      seedCompanyTeams()
      seedTimeEntries()

      return { ok: true, message: 'Database re-seeded successfully' }
    }),
})
