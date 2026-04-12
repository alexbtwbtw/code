import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from '@hono/node-server/serve-static'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from './router'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { db } from './db'

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

// Serve CV PDFs inline so the browser can display them (with #page=N fragment)
app.get('/api/cv/:cvId', (c) => {
  const cvId = parseInt(c.req.param('cvId'), 10)
  if (isNaN(cvId)) return c.json({ error: 'Invalid CV id' }, 400)
  const row = db.prepare(`SELECT file_data, filename FROM member_cvs WHERE id = ?`).get(cvId) as
    { file_data: string; filename: string } | undefined
  if (!row) return c.json({ error: 'CV not found' }, 404)
  const bytes = Buffer.from(row.file_data, 'base64')
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${row.filename}"`,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=3600',
    },
  })
})

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
