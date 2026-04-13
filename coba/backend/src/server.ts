// Load environment variables from backend/.env
import 'dotenv/config'

import { seedProjects } from './seed/projects'
import { seedTeam } from './seed/team'
import { seedRequirements } from './seed/requirements'
import { seedTasks } from './seed/tasks'
import { seedCompanyTeams } from './seed/companyTeams'
import { seedTimeEntries } from './seed/timeEntries'
import { seedFinance } from './seed/finance'

import { serve } from '@hono/node-server'
import app from './index'
import { db } from './db'

const port = Number(process.env.PORT) || 3000

function startServer() {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Server running at http://localhost:${info.port}`)
  })
}

// Only seed when DB is empty — prevents duplicate data on EC2 restarts
// (with DB_PATH set to a persistent file, data survives pm2 reloads)
const projectCount = (db.prepare('SELECT COUNT(*) as n FROM projects').get() as { n: number }).n

if (projectCount === 0) {
  seedProjects()
  seedTeam()
    .then(() => {
      seedRequirements()
      seedTasks()
      seedCompanyTeams()
      seedTimeEntries()
      seedFinance()
      startServer()
    })
    .catch(err => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
} else {
  console.log(`DB already populated (${projectCount} projects) — skipping seed`)
  startServer()
}
