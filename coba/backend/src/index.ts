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

// ── Engineering: DWG buffer reader ───────────────────────────────────────────

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

// ── Engineering: DWG → DXF conversion endpoint ───────────────────────────────

app.get('/api/engineering/:id/dxf', async (c) => {
  const authErr = requireRole(c)
  if (authErr) return authErr

  const id = parseInt(c.req.param('id'), 10)
  if (isNaN(id) || id <= 0) return c.json({ error: 'Invalid id' }, 400)

  const buf = readDwgBuffer(id)
  if (!buf) return c.json({ error: 'File not found' }, 404)

  const { spawnSync } = await import('child_process')
  const { mkdtempSync, writeFileSync, readFileSync: readFS, readdirSync, mkdirSync, rmSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { join } = await import('path')

  const baseDir  = mkdtempSync(join(tmpdir(), 'dwg2dxf-'))
  const inDir    = join(baseDir, 'in')
  const outDir   = join(baseDir, 'out')

  try {
    mkdirSync(inDir)
    mkdirSync(outDir)
    writeFileSync(join(inDir, 'file.dwg'), buf)

    // Try the Linux/EC2 executable name; on Windows the same binary is typically
    // on PATH as ODAFileConverter or ODAFileConverter.exe — spawnSync resolves
    // the .exe suffix automatically on Windows when it is on PATH.
    const result = spawnSync(
      'ODAFileConverter',
      [inDir, outDir, 'ACAD', 'DXF', '0', '1'],
      {
        timeout: 30_000,
        env: { ...process.env, PATH: `${process.env.PATH ?? ''}:/usr/bin:/usr/local/bin` },
      },
    )

    if (result.error || result.status !== 0) {
      // Distinguish "not found" (ENOENT) from other failures
      if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
        return c.json({ error: 'oda_not_installed' }, 503)
      }
      return c.json({ error: 'oda_not_installed' }, 503)
    }

    // Find the output .dxf file (ODA names it after the input, e.g. file.dxf)
    const outFiles = readdirSync(outDir)
    const dxfFile  = outFiles.find(f => f.toLowerCase().endsWith('.dxf'))
    if (!dxfFile) {
      return c.json({ error: 'oda_not_installed' }, 503)
    }

    const dxfContent = readFS(join(outDir, dxfFile), 'utf8')

    return new Response(dxfContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } finally {
    try { rmSync(baseDir, { recursive: true, force: true }) } catch { /* best-effort cleanup */ }
  }
})

// ── Engineering: entity-level DXF diff ───────────────────────────────────────

app.post('/api/engineering/entity-diff', async (c) => {
  const authErr = requireRole(c)
  if (authErr) return authErr

  let body: { idA?: unknown; idB?: unknown }
  try {
    body = await c.req.json() as { idA?: unknown; idB?: unknown }
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const idA = typeof body.idA === 'number' ? body.idA : parseInt(String(body.idA ?? ''), 10)
  const idB = typeof body.idB === 'number' ? body.idB : parseInt(String(body.idB ?? ''), 10)
  if (isNaN(idA) || idA <= 0 || isNaN(idB) || idB <= 0) {
    return c.json({ error: 'idA and idB must be positive integers' }, 400)
  }

  const bufA = readDwgBuffer(idA)
  const bufB = readDwgBuffer(idB)
  if (!bufA) return c.json({ error: `File ${idA} not found` }, 404)
  if (!bufB) return c.json({ error: `File ${idB} not found` }, 404)

  // Attempt ODA conversion for both files
  const { spawnSync } = await import('child_process')
  const { mkdtempSync, writeFileSync, readFileSync, mkdirSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { join } = await import('path')

  function dwgToDxf(dwgBuffer: Buffer): string | null {
    try {
      const dir    = mkdtempSync(join(tmpdir(), 'dwg-'))
      const inDir  = join(dir, 'in')
      const outDir = join(dir, 'out')
      mkdirSync(inDir)
      mkdirSync(outDir)
      writeFileSync(join(inDir, 'file.dwg'), dwgBuffer)
      const result = spawnSync(
        'ODAFileConverter',
        [inDir, outDir, 'ACAD2018', 'DXF', '0', '1'],
        {
          timeout: 30000,
          env: { ...process.env, PATH: `${process.env.PATH}:/usr/bin:/usr/local/bin` },
        },
      )
      if (result.status !== 0) return null
      return readFileSync(join(outDir, 'file.dxf'), 'utf8')
    } catch {
      return null
    }
  }

  const dxfA = dwgToDxf(bufA)
  const dxfB = dwgToDxf(bufB)

  if (dxfA === null || dxfB === null) {
    return c.json({ available: false, reason: 'ODA File Converter not installed or failed' })
  }

  // Parse DXF files
  const DxfParser = (await import('dxf-parser')).default
  const parser = new DxfParser()

  let docA: { entities: unknown[] }
  let docB: { entities: unknown[] }
  try {
    docA = parser.parseSync(dxfA) as { entities: unknown[] }
    docB = parser.parseSync(dxfB) as { entities: unknown[] }
  } catch (err) {
    return c.json({ available: false, reason: `DXF parse error: ${err instanceof Error ? err.message : String(err)}` })
  }

  type Entity = { type: string; handle?: string; layer?: string; [key: string]: unknown }
  interface EntitySummary {
    type: string
    layer: string
    key: string
    data: Record<string, unknown>
  }

  function roundCoord(v: unknown): unknown {
    if (typeof v === 'number') return Math.round(v * 100) / 100
    if (v && typeof v === 'object') {
      const result: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        result[k] = roundCoord(val)
      }
      return result
    }
    return v
  }

  function extractCoords(e: Entity): unknown {
    // Grab common geometry fields
    const coords: Record<string, unknown> = {}
    const geoFields = ['startPoint', 'endPoint', 'center', 'vertices', 'position',
      'insertionPoint', 'x', 'y', 'z', 'x1', 'y1', 'x2', 'y2', 'radius',
      'startAngle', 'endAngle', 'majorAxisEndPoint', 'axisRatio']
    for (const field of geoFields) {
      if (field in e) coords[field] = roundCoord(e[field])
    }
    return coords
  }

  function summariseEntity(e: Entity): EntitySummary {
    const type  = e.type ?? 'UNKNOWN'
    const layer = e.layer ?? '0'
    const coords = extractCoords(e)
    const key = `${type}|${layer}|${JSON.stringify(coords)}`
    // Build data: type, layer, plus a few human-readable fields
    const data: Record<string, unknown> = { type, layer }
    const displayFields = ['text', 'string', 'name', 'handle', 'radius',
      'startAngle', 'endAngle', 'startPoint', 'endPoint', 'center', 'vertices']
    for (const f of displayFields) {
      if (f in e && e[f] !== undefined) data[f] = e[f]
    }
    return { type, layer, key, data }
  }

  function diffEntities(
    aEntities: Entity[],
    bEntities: Entity[],
  ): { added: EntitySummary[]; removed: EntitySummary[]; total: { a: number; b: number } } {
    const aMap = new Map<string, EntitySummary>()
    const bMap = new Map<string, EntitySummary>()

    for (const e of aEntities) {
      const s = summariseEntity(e)
      aMap.set(s.key, s)
    }
    for (const e of bEntities) {
      const s = summariseEntity(e)
      bMap.set(s.key, s)
    }

    const added: EntitySummary[]   = []
    const removed: EntitySummary[] = []

    for (const [key, s] of bMap) {
      if (!aMap.has(key)) added.push(s)
    }
    for (const [key, s] of aMap) {
      if (!bMap.has(key)) removed.push(s)
    }

    return { added, removed, total: { a: aEntities.length, b: bEntities.length } }
  }

  const entitiesA = (docA.entities ?? []) as Entity[]
  const entitiesB = (docB.entities ?? []) as Entity[]
  const diff      = diffEntities(entitiesA, entitiesB)

  const CAP = 200
  const addedCapped   = diff.added.slice(0, CAP)
  const removedCapped = diff.removed.slice(0, CAP)

  const unchangedCount = entitiesA.length - diff.removed.length

  return c.json({
    available: true,
    added:    addedCapped,
    removed:  removedCapped,
    total:    diff.total,
    summary: {
      addedCount:     diff.added.length,
      removedCount:   diff.removed.length,
      unchangedCount: Math.max(0, unchangedCount),
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
