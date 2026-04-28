import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serveStatic } from '@hono/node-server/serve-static'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from './router'
import { readFileSync, existsSync } from 'fs'
import path from 'path'

const app = new Hono()

const serveStatic_ = process.env.SERVE_STATIC === 'true'
const staticRoot = process.env.STATIC_ROOT ?? path.resolve(__dirname, '../../frontend/dist')

// --- Rate limiter for upload endpoints ---
const uploadRateLimiter = new Map<string, { count: number; resetAt: number }>()
function checkUploadRateLimit(ip: string): boolean {
  const now = Date.now()
  const rec = uploadRateLimiter.get(ip)
  if (!rec || now > rec.resetAt) {
    uploadRateLimiter.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (rec.count >= 20) return false
  rec.count++
  return true
}

app.use('*', logger())

// Security headers middleware — runs post-response so headers apply to all responses
app.use('*', async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
})

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*'  // same-origin / non-browser requests
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return origin
    if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return origin
    return false  // reject everything else
  },
}))

// Request body size limit for tRPC
app.use('/trpc/*', async (c, next) => {
  const contentLength = parseInt(c.req.header('content-length') ?? '0', 10)
  if (contentLength > 2 * 1024 * 1024) { // 2MB
    return c.json({ error: 'Request too large' }, 413)
  }
  await next()
})

app.get('/api/health', (c) => c.json({ status: 'ok', app: 'dinaxis' }))

// Document blob streaming endpoint (for blob and filesystem adapters)
// This is a REST endpoint, not tRPC, because it streams binary data
app.get('/api/documents/:id/blob', async (c) => {
  const { getStorageAdapter } = await import('./lib/storage')
  const { db } = await import('./db')
  const id = c.req.param('id')
  const doc = db.prepare('SELECT filename, mime_type, storage_key, storage_adapter FROM documents WHERE id = ?').get(id) as
    { filename: string; mime_type: string; storage_key: string; storage_adapter: string } | undefined
  if (!doc) return c.json({ error: 'Document not found' }, 404)
  const adapter = getStorageAdapter()
  const adapterType = process.env.STORAGE ?? 'blob'
  if (adapterType === 's3') {
    // For S3, redirect to presigned URL
    const url = await adapter.getServeUrl(doc.storage_key)
    return c.redirect(url)
  }
  try {
    const buf = await adapter.get(doc.storage_key)
    const safeName = doc.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': doc.mime_type || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${safeName}"`,
        'Content-Length': String(buf.length),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return c.json({ error: 'File not found in storage' }, 404)
  }
})

// Document upload endpoint
app.post('/api/documents/upload', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkUploadRateLimit(ip)) {
    return c.json({ error: 'Demasiados pedidos. Tente novamente em 1 minuto.' }, 429)
  }

  const { getStorageAdapter } = await import('./lib/storage')
  const { db } = await import('./db')
  const DOCUMENT_MAX_BYTES = 50 * 1024 * 1024 // 50 MB

  const contentLength = parseInt(c.req.header('content-length') ?? '0', 10)
  if (!isNaN(contentLength) && contentLength > DOCUMENT_MAX_BYTES) {
    return c.json({ error: 'File too large (max 50 MB)' }, 413)
  }

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Invalid multipart form data' }, 400)
  }

  const file = formData.get('file') as File | null
  const claimId = formData.get('claimId') as string | null
  const label = (formData.get('label') as string | null) ?? ''
  const description = (formData.get('description') as string | null) ?? ''

  if (!file) return c.json({ error: 'No file field' }, 400)
  if (!claimId) return c.json({ error: 'No claimId field' }, 400)

  const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
  ])

  const mimeType = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return c.json({ error: 'Tipo de ficheiro não permitido' }, 400)
  }

  const arrayBuffer = await file.arrayBuffer()
  const buf = Buffer.from(arrayBuffer)
  if (buf.length > DOCUMENT_MAX_BYTES) return c.json({ error: 'File too large (max 50 MB)' }, 413)

  const rawName = file.name || 'upload'
  const safeName = rawName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')  // no leading dots (.htaccess etc)
    .replace(/\.(exe|bat|cmd|com|scr|vbs|msi|sh|ps1|jar|php|asp|aspx)$/i, '.blocked')
    .slice(0, 200) || 'upload'
  const adapterType = process.env.STORAGE ?? 'blob'
  const adapter = getStorageAdapter()
  const storageKey = await adapter.save(safeName, buf, mimeType)
  const id = crypto.randomUUID()

  const { createDocument } = await import('./services/documents')
  const doc = createDocument({ id, claimId, filename: safeName, mimeType, storageKey, storageAdapter: adapterType, sizeBytes: buf.length, label, description })
  return c.json(doc, 201)
})

// Line item photo blob streaming endpoint
app.get('/api/line-item-photos/:id/blob', async (c) => {
  const { getStorageAdapter } = await import('./lib/storage')
  const { db } = await import('./db')
  const id = c.req.param('id')
  const photo = db.prepare('SELECT filename, mime_type, storage_key, storage_adapter FROM line_item_photos WHERE id = ?').get(id) as
    { filename: string; mime_type: string; storage_key: string; storage_adapter: string } | undefined
  if (!photo) return c.json({ error: 'Photo not found' }, 404)
  const adapter = getStorageAdapter()
  const adapterType = process.env.STORAGE ?? 'blob'
  if (adapterType === 's3') {
    const url = await adapter.getServeUrl(photo.storage_key)
    return c.redirect(url)
  }
  try {
    const buf = await adapter.get(photo.storage_key)
    const safeName = photo.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': photo.mime_type || 'image/jpeg',
        'Content-Disposition': `inline; filename="${safeName}"`,
        'Content-Length': String(buf.length),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return c.json({ error: 'File not found in storage' }, 404)
  }
})

// Line item photo upload endpoint
app.post('/api/line-item-photos/upload', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkUploadRateLimit(ip)) {
    return c.json({ error: 'Demasiados pedidos. Tente novamente em 1 minuto.' }, 429)
  }

  const { getStorageAdapter } = await import('./lib/storage')
  const { db } = await import('./db')
  const PHOTO_MAX_BYTES = 20 * 1024 * 1024 // 20 MB

  const contentLength = parseInt(c.req.header('content-length') ?? '0', 10)
  if (!isNaN(contentLength) && contentLength > PHOTO_MAX_BYTES) {
    return c.json({ error: 'File too large (max 20 MB)' }, 413)
  }

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ error: 'Invalid multipart form data' }, 400)
  }

  const file = formData.get('file') as File | null
  const lineItemIdStr = formData.get('lineItemId') as string | null

  if (!file) return c.json({ error: 'No file field' }, 400)
  if (!lineItemIdStr) return c.json({ error: 'No lineItemId field' }, 400)

  const lineItemId = parseInt(lineItemIdStr, 10)
  if (isNaN(lineItemId) || lineItemId <= 0) return c.json({ error: 'Invalid lineItemId' }, 400)

  const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
  const mimeType = file.type || 'application/octet-stream'
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    return c.json({ error: 'Apenas imagens são permitidas' }, 400)
  }

  const arrayBuffer = await file.arrayBuffer()
  const buf = Buffer.from(arrayBuffer)
  if (buf.length > PHOTO_MAX_BYTES) return c.json({ error: 'File too large (max 20 MB)' }, 413)

  const rawName = file.name || 'photo.jpg'
  const safeName = rawName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')  // no leading dots (.htaccess etc)
    .replace(/\.(exe|bat|cmd|com|scr|vbs|msi|sh|ps1|jar|php|asp|aspx)$/i, '.blocked')
    .slice(0, 200) || 'photo.jpg'
  const adapterType = process.env.STORAGE ?? 'blob'
  const adapter = getStorageAdapter()
  const storageKey = await adapter.save(safeName, buf, mimeType)
  const id = crypto.randomUUID()

  db.prepare(`
    INSERT INTO line_item_photos (id, line_item_id, filename, mime_type, storage_key, storage_adapter, size_bytes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, lineItemId, safeName, mimeType, storageKey, adapterType, buf.length)

  const row = db.prepare('SELECT uploaded_at FROM line_item_photos WHERE id = ?').get(id) as { uploaded_at: string }
  return c.json({ id, lineItemId, filename: safeName, mimeType, sizeBytes: buf.length, uploadedAt: row.uploaded_at }, 201)
})

app.all('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({}),
  })
)

if (serveStatic_) {
  app.use('/*', serveStatic({ root: staticRoot }))
  const indexHtml = path.join(staticRoot, 'index.html')
  app.get('*', (c) => {
    if (existsSync(indexHtml)) {
      return c.html(readFileSync(indexHtml, 'utf-8'))
    }
    return c.text('Frontend not built. Run: npm run build', 503)
  })
}

export default app
