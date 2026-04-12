import { router, publicProcedure } from '../trpc'

export const systemRouter = router({
  aiEnabled: publicProcedure.query(() => {
    return { aiEnabled: process.env.USE_REAL_AI === 'true' }
  }),
})
