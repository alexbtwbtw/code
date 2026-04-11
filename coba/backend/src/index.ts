import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from '@hono/node-server/serve-static'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from './router'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const app = new Hono()

// In production/Electron the backend serves the built frontend too
const serveStatic_ = process.env.SERVE_STATIC === 'true'

// __dirname is the backend/dist/ directory; ../../frontend/dist resolves correctly
// both in the repo and in the Electron resources layout
const staticRoot = process.env.STATIC_ROOT
  ?? path.resolve(__dirname, '../../frontend/dist')

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use('*', logger())

// Allow the Vite dev origin in dev; allow any localhost origin in production
// (Electron's renderer window origin is http://localhost:PORT)
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*'                              // same-origin / file://
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return origin
    return 'http://localhost:5173'
  },
}))

// ── API routes ─────────────────────────────────────────────────────────────────

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.all('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({}),
  })
)

// ── Static frontend (production / Electron) ────────────────────────────────────

if (serveStatic_) {
  // Serve assets (JS, CSS, images, etc.)
  app.use('/*', serveStatic({ root: staticRoot }))

  // SPA fallback — serve index.html for all unmatched routes so client-side
  // routing works when the user reloads or opens a deep link directly
  const indexHtml = path.join(staticRoot, 'index.html')
  app.get('*', (c) => {
    if (existsSync(indexHtml)) {
      return c.html(readFileSync(indexHtml, 'utf-8'))
    }
    return c.text('Frontend not built. Run: npm run build', 503)
  })
}

export default app
