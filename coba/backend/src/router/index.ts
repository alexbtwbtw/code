import { router } from '../trpc'
import { projectsRouter } from './projects'
import { geoRouter } from './geo'
import { teamRouter } from './team'
import { structuresRouter } from './structures'
import { featuresRouter } from './features'
import { requirementsRouter } from './requirements'
import { tasksRouter } from './tasks'
import { systemRouter } from './system'

export const appRouter = router({
  projects:     projectsRouter,
  geo:          geoRouter,
  structures:   structuresRouter,
  features:     featuresRouter,
  team:         teamRouter,
  requirements: requirementsRouter,
  tasks:        tasksRouter,
  system:       systemRouter,
})

export type AppRouter = typeof appRouter
