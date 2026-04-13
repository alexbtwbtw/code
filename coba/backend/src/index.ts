import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from '@hono/node-server/serve-static'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from './router'
import type { AppContext } from './trpc'
import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { db } from './db'

// ── DWG helpers ────────────────────────────────────────────────────────────────

/**
 * Detect DWG version from the ASCII header bytes.
 * DWG files start with "AC" followed by a 4-digit version code, e.g. "AC1032".
 */
function detectDwgVersion(buf: Buffer): string | null {
  if (buf.length < 6) return null
  const header = buf.subarray(0, 6).toString('ascii')
  if (!header.startsWith('AC')) return null
  const code = header.slice(2)
  const versionMap: Record<string, string> = {
    '1015': '2000',
    '1018': '2004',
    '1021': '2007',
    '1024': '2010',
    '1027': '2013',
    '1032': '2018+',
    '1006': 'R10',
    '1009': 'R11/R12',
    '1012': 'R13',
    '1014': 'R14',
  }
  return versionMap[code] ?? `AC${code}`
}

/**
 * Convert DWG bytes to DXF text using ODA File Converter CLI.
 * Returns the DXF string on success or throws on failure.
 */
async function convertDwgToDxf(dwgBuffer: Buffer): Promise<string> {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'dwg-'))
  const inputPath = path.join(tempDir, 'input.dwg')
  const outputDir = path.join(tempDir, 'out')
  mkdirSync(outputDir)
  writeFileSync(inputPath, dwgBuffer)

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(
        'ODAFileConverter',
        [tempDir, outputDir, 'ACAD2018', 'DXF', '0', '1'],
        {
          env: {
            ...process.env,
            PATH: `${process.env.PATH};C:\\Program Files\\ODA\\ODAFileConverter`,
          },
        },
      )
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`ODA converter exited with code ${code}`))
      })
      proc.on('error', reject)
    })

    const dxfPath = path.join(outputDir, 'input.dxf')
    const dxfContent = readFileSync(dxfPath, 'utf8')
    return dxfContent
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

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

// ── Engineering: DWG upload ────────────────────────────────────────────────────
const DWG_MAX_BYTES = 50 * 1024 * 1024 // 50 MB

app.post('/api/engineering/upload', async (c) => {
  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Invalid multipart form data' }, 400)
  }

  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file field in form data' }, 400)

  const fileName = file.name ?? 'upload.dwg'
  const arrayBuffer = await file.arrayBuffer()
  const buf = Buffer.from(arrayBuffer)

  // Size check
  if (buf.length > DWG_MAX_BYTES) {
    return c.json({ error: 'File too large (max 50 MB)' }, 413)
  }

  // Magic bytes check: DWG files start with "AC"
  if (buf.length < 6 || buf.subarray(0, 2).toString('ascii') !== 'AC') {
    return c.json({ error: 'Invalid DWG file (magic bytes mismatch)' }, 400)
  }

  const version = detectDwgVersion(buf)
  const projectIdRaw = formData.get('projectId')
  const projectId = projectIdRaw ? parseInt(String(projectIdRaw), 10) : null

  // Insert as pending
  const result = db.prepare(`
    INSERT INTO dwg_files (project_id, file_name, original_dwg, version, status, file_size)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(projectId ?? null, fileName, buf, version, buf.length)

  const id = Number(result.lastInsertRowid)

  // Trigger async conversion — does not block the response
  ;(async () => {
    db.prepare(`UPDATE dwg_files SET status = 'converting' WHERE id = ?`).run(id)
    try {
      const dxfContent = await convertDwgToDxf(buf)
      db.prepare(`UPDATE dwg_files SET status = 'ready', dxf_content = ? WHERE id = ?`).run(dxfContent, id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      const isNotInstalled = msg.includes('ENOENT') || msg.includes('not found') || msg.includes('spawn')
      const errorMsg = isNotInstalled ? 'ODA File Converter not installed' : msg
      db.prepare(`UPDATE dwg_files SET status = 'failed', error_msg = ? WHERE id = ?`).run(errorMsg, id)
    }
  })().catch(() => {/* already handled above */})

  return c.json({ id, fileName, version, status: 'pending' }, 201)
})

// ── Engineering: DWG download ──────────────────────────────────────────────────
app.get('/api/engineering/:id/download', (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

  const row = db.prepare(`SELECT file_name, original_dwg FROM dwg_files WHERE id = ?`).get(id) as
    { file_name: string; original_dwg: Buffer } | undefined
  if (!row) return c.json({ error: 'File not found' }, 404)

  const rawData = row.original_dwg as unknown as Buffer | string
  const buf: Buffer<ArrayBuffer> = Buffer.isBuffer(rawData)
    ? Buffer.from(rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength) as ArrayBuffer)
    : Buffer.from(rawData as string, 'binary')

  const safeName = row.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length': String(buf.length),
    },
  })
})

app.all('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    // TODO: Replace with verified JWT/Cognito claims when real auth is implemented.
    // For now, trust the x-user-role/id/name headers sent by the frontend dev switcher.
    createContext: ({ req }): AppContext => ({
      userRole: (req.headers.get('x-user-role') ?? null) as import('./trpc').Role | null,
      userId:   req.headers.get('x-user-id')   ?? null,
      userName: req.headers.get('x-user-name') ?? null,
    }),
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
