import { router } from '../trpc'
import { scoresRouter } from './scores'

export const appRouter = router({
  scores: scoresRouter,
})

export type AppRouter = typeof appRouter
