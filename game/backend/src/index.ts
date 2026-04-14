import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from './router'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*'
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return origin
    return null
  },
}))

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.all('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({}),
  })
)

export default app
