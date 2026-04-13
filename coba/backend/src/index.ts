import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from '@hono/node-server/serve-static'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from './router'
import type { AppContext } from './trpc'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
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
    '1006': 'R10',
    '1009': 'R12',
    '1012': 'R13',
    '1014': 'R14',
    '1015': '2000',
    '1018': '2004',
    '1021': '2007',
    '1024': '2010',
    '1027': '2013',
    '1032': '2018+',
  }
  return versionMap[code] ?? `AC${code}`
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

// ── Engineering helpers ────────────────────────────────────────────────────────

const DWG_MAX_BYTES = 50 * 1024 * 1024 // 50 MB

/**
 * Sanitize a filename for safe storage and use in HTTP headers.
 * Keeps only alphanumerics, dots, hyphens, and underscores.
 * Truncates to 200 characters and collapses multiple dots to prevent
 * extension-spoofing tricks like "evil.dwg.exe".
 */
function sanitizeFileName(raw: string): string {
  const name = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
  // Ensure it ends with .dwg (case-insensitive) and has a non-empty base
  return name || 'upload.dwg'
}

/**
 * Enforce a minimum role requirement on the engineering REST endpoints.
 * Mirrors the same header-trust model used by tRPC createContext.
 * Returns null if authorised, or a Response to return immediately if not.
 */
function requireRole(c: Context): Response | null {
  const role = c.req.header('x-user-role')
  if (!role) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}

// ── Engineering: DWG upload ────────────────────────────────────────────────────

app.post('/api/engineering/upload', async (c) => {
  // Require any authenticated user to upload
  const authErr = requireRole(c)
  if (authErr) return authErr

  // Reject oversized requests before reading the body.
  // The Content-Length header is advisory (browsers always send it for file
  // uploads), so we use it as an early gate and re-check after buffering.
  const contentLength = parseInt(c.req.header('content-length') ?? '0', 10)
  if (!isNaN(contentLength) && contentLength > DWG_MAX_BYTES) {
    return c.json({ error: 'File too large (max 50 MB)' }, 413)
  }

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Invalid multipart form data' }, 400)
  }

  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file field in form data' }, 400)

  // Sanitize the filename before any further use or DB storage
  const fileName = sanitizeFileName(file.name ?? 'upload.dwg')

  const arrayBuffer = await file.arrayBuffer()
  const buf = Buffer.from(arrayBuffer)

  // Definitive size check after buffering (Content-Length could have been spoofed)
  if (buf.length > DWG_MAX_BYTES) {
    return c.json({ error: 'File too large (max 50 MB)' }, 413)
  }

  // Magic bytes check: DWG files start with "AC" followed by a 4-digit version.
  // This is a necessary but not sufficient check — a crafted file could embed
  // the correct header. The WASM renderer adds a second layer of validation.
  if (buf.length < 6 || buf.subarray(0, 2).toString('ascii') !== 'AC') {
    return c.json({ error: 'Invalid DWG file (magic bytes mismatch)' }, 400)
  }

  const dwgVersion = detectDwgVersion(buf)
  const projectIdRaw = formData.get('projectId')
  const projectId = projectIdRaw ? parseInt(String(projectIdRaw), 10) : null

  const result = db.prepare(`
    INSERT INTO dwg_files (project_id, file_name, display_name, original_dwg, dwg_version, file_size)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(projectId ?? null, fileName, fileName, buf, dwgVersion, buf.length)

  const id = Number(result.lastInsertRowid)
  const row = db.prepare(`SELECT uploaded_at FROM dwg_files WHERE id = ?`).get(id) as { uploaded_at: string }

  return c.json({ id, fileName, dwgVersion, fileSize: buf.length, uploadedAt: row.uploaded_at }, 201)
})

// ── Engineering: DWG download ──────────────────────────────────────────────────
app.get('/api/engineering/:id/download', (c) => {
  // Require any authenticated user — unauthenticated callers must not be able
  // to download engineering files just by guessing numeric IDs.
  const authErr = requireRole(c)
  if (authErr) return authErr

  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id) || id <= 0) return c.json({ error: 'Invalid id' }, 400)

  const row = db.prepare(`SELECT file_name, original_dwg FROM dwg_files WHERE id = ?`).get(id) as
    { file_name: string; original_dwg: Buffer } | undefined
  if (!row) return c.json({ error: 'File not found' }, 404)

  const rawData = row.original_dwg as unknown as Buffer | string
  const buf: Buffer<ArrayBuffer> = Buffer.isBuffer(rawData)
    ? Buffer.from(rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength) as ArrayBuffer)
    : Buffer.from(rawData as string, 'binary')

  // file_name is already sanitized at upload time; re-sanitize defensively in
  // case older rows in the DB were stored before this hardening was applied.
  const safeName = row.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')

  return new Response(buf, {
    status: 200,
    headers: {
      // application/octet-stream prevents the browser from executing or
      // rendering the binary as any interpreted content type.
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Content-Length': String(buf.length),
      'X-Content-Type-Options': 'nosniff',
    },
  })
})

// ── Engineering: serve raw DWG bytes for WASM viewer ──────────────────────────
app.get('/api/engineering/:id/dwg', (c) => {
  // Require any authenticated user — the WASM viewer is only rendered for
  // logged-in users. Blocking unauthenticated access here closes the gap where
  // a raw URL could be used to extract the binary outside the UI.
  const authErr = requireRole(c)
  if (authErr) return authErr

  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id) || id <= 0) return c.json({ error: 'Invalid id' }, 400)

  const row = db.prepare(`SELECT original_dwg FROM dwg_files WHERE id = ?`).get(id) as
    { original_dwg: Buffer } | undefined
  if (!row) return c.json({ error: 'File not found' }, 404)

  const rawData = row.original_dwg as unknown as Buffer | string
  const buf: Buffer<ArrayBuffer> = Buffer.isBuffer(rawData)
    ? Buffer.from(rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength) as ArrayBuffer)
    : Buffer.from(rawData as string, 'binary')

  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(buf.length),
      'X-Content-Type-Options': 'nosniff',
    },
  })
})

// ── Engineering: DWG date scanning ───────────────────────────────────────────

const JD_MIN = 2444239.5  // Jan 1 1980
const JD_MAX = 2469807.5  // Dec 31 2050

function dateToJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

function julianToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000)
}

function findDateCandidates(buf: Buffer): { offset: number; julian: number; date: Date }[] {
  const results: { offset: number; julian: number; date: Date }[] = []
  for (let i = 0; i <= buf.length - 8; i++) {
    const val = buf.readDoubleLE(i)
    if (val >= JD_MIN && val <= JD_MAX && Number.isFinite(val)) {
      results.push({ offset: i, julian: val, date: julianToDate(val) })
    }
  }
  return results
}

/**
 * Group candidates within 512 bytes of each other; return the largest group.
 */
function groupCandidates(
  candidates: { offset: number; julian: number; date: Date }[],
): { offset: number; julian: number; date: Date }[] {
  if (candidates.length === 0) return []

  // Sort by offset
  const sorted = [...candidates].sort((a, b) => a.offset - b.offset)

  let bestGroup: typeof sorted = []
  let current: typeof sorted = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].offset - sorted[i - 1].offset <= 512) {
      current.push(sorted[i])
    } else {
      if (current.length > bestGroup.length) bestGroup = current
      current = [sorted[i]]
    }
  }
  if (current.length > bestGroup.length) bestGroup = current

  return bestGroup
}

/**
 * Read the original_dwg buffer from the DB for a given id.
 * Returns null if not found.
 */
function readDwgBuffer(id: number): Buffer | null {
  const row = db.prepare(`SELECT original_dwg FROM dwg_files WHERE id = ?`).get(id) as
    { original_dwg: Buffer | string } | undefined
  if (!row) return null
  const rawData = row.original_dwg as unknown as Buffer | string
  return Buffer.isBuffer(rawData)
    ? Buffer.from(rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength) as ArrayBuffer)
    : Buffer.from(rawData as string, 'binary')
}

app.get('/api/engineering/:id/dates', (c) => {
  const authErr = requireRole(c)
  if (authErr) return authErr

  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id) || id <= 0) return c.json({ error: 'Invalid id' }, 400)

  const buf = readDwgBuffer(id)
  if (!buf) return c.json({ error: 'File not found' }, 404)

  // Validate magic bytes
  if (buf.length < 6 || buf.subarray(0, 2).toString('ascii') !== 'AC') {
    return c.json({ error: 'Invalid DWG file (magic bytes mismatch)' }, 400)
  }

  const allCandidates = findDateCandidates(buf)
  const group = groupCandidates(allCandidates)

  const candidates = group.map(cand => ({
    offset: cand.offset,
    date: cand.date.toISOString(),
    julian: cand.julian,
  }))

  return c.json({ candidates })
})

app.post('/api/engineering/:id/patch-dates', async (c) => {
  const authErr = requireRole(c)
  if (authErr) return authErr

  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id) || id <= 0) return c.json({ error: 'Invalid id' }, 400)

  let body: { offsets?: unknown; newDate?: unknown }
  try {
    body = await c.req.json() as { offsets?: unknown; newDate?: unknown }
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const { offsets, newDate } = body

  // Validate offsets
  if (!Array.isArray(offsets) || offsets.length === 0) {
    return c.json({ error: 'offsets must be a non-empty array' }, 400)
  }
  for (const o of offsets) {
    if (typeof o !== 'number' || !Number.isInteger(o) || o < 0) {
      return c.json({ error: 'Each offset must be a non-negative integer' }, 400)
    }
  }

  // Validate newDate
  if (typeof newDate !== 'string' || !newDate) {
    return c.json({ error: 'newDate must be a non-empty string' }, 400)
  }
  const parsedDate = new Date(newDate)
  if (isNaN(parsedDate.getTime())) {
    return c.json({ error: 'newDate is not a valid date' }, 400)
  }
  const newJulian = dateToJulian(parsedDate)
  if (newJulian < JD_MIN || newJulian > JD_MAX) {
    return c.json({ error: 'newDate must be in range 1980–2050' }, 400)
  }

  const buf = readDwgBuffer(id)
  if (!buf) return c.json({ error: 'File not found' }, 404)

  // Validate magic bytes
  if (buf.length < 6 || buf.subarray(0, 2).toString('ascii') !== 'AC') {
    return c.json({ error: 'Invalid DWG file (magic bytes mismatch)' }, 400)
  }

  // Validate all offsets are within file bounds
  for (const o of offsets as number[]) {
    if (o + 8 > buf.length) {
      return c.json({ error: `Offset ${o} is out of file bounds (file size: ${buf.length})` }, 400)
    }
  }

  // Work on a COPY of the buffer — never mutate the original
  const patched = Buffer.from(buf)

  for (const o of offsets as number[]) {
    patched.writeDoubleLE(newJulian, o)
  }

  // Post-patch validations
  // 1. Magic bytes still valid
  if (patched.subarray(0, 2).toString('ascii') !== 'AC') {
    return c.json({ error: 'Patch corrupted the file header (magic bytes)' }, 500)
  }

  // 2. File size unchanged
  if (patched.length !== buf.length) {
    return c.json({ error: 'Patch changed file size unexpectedly' }, 500)
  }

  // 3. Re-read each offset and confirm it decodes to the expected Julian date (within 0.001 tolerance)
  for (const o of offsets as number[]) {
    const readBack = patched.readDoubleLE(o)
    if (Math.abs(readBack - newJulian) > 0.001) {
      return c.json({ error: `Verification failed at offset ${o}: expected ${newJulian}, got ${readBack}` }, 500)
    }
  }

  // Save patched buffer back to DB
  db.prepare(`UPDATE dwg_files SET original_dwg = ? WHERE id = ?`).run(patched, id)

  return c.json({
    success: true,
    patchedOffsets: offsets,
    newJulian,
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
