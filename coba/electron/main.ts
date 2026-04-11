import { app, BrowserWindow, shell } from 'electron'
import http from 'http'
import path from 'path'

// ── Constants ──────────────────────────────────────────────────────────────────

const isDev  = !app.isPackaged
const PORT   = Number(process.env.PORT) || 3000
const DEV_URL  = 'http://localhost:5173' // Vite dev server
const PROD_URL = `http://localhost:${PORT}`

// ── Backend startup (production only) ─────────────────────────────────────────

async function startBackend(): Promise<void> {
  if (isDev) return // dev: backend is started separately via `npm run dev`

  // Tell the backend to serve the bundled frontend and accept any origin
  process.env.PORT        = String(PORT)
  process.env.NODE_ENV    = 'production'
  process.env.SERVE_STATIC = 'true'

  // The built backend sits next to the app resources in production
  const serverEntry = path.join(process.resourcesPath, 'backend', 'dist', 'server.js')

  // Dynamic import works across CJS → ESM boundary (backend compiles to ESM)
  await import(serverEntry)
}

// ── Health-check wait ──────────────────────────────────────────────────────────

function waitForBackend(port: number, maxAttempts = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const check = () => {
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        if (res.statusCode === 200) return resolve()
        retry()
      })
      req.on('error', retry)
      req.setTimeout(500, () => { req.destroy(); retry() })
    }
    const retry = () => {
      if (++attempts >= maxAttempts) return reject(new Error('Backend did not start in time'))
      setTimeout(check, 400)
    }
    check()
  })
}

// ── Window ─────────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    title: 'COBA',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  win.loadURL(isDev ? DEV_URL : PROD_URL)

  // Open <a target="_blank"> links in the OS browser, not a new Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) win.webContents.openDevTools()

  return win
}

// ── App lifecycle ──────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  await startBackend()

  if (!isDev) {
    // Wait until the Hono server is accepting requests before opening the window
    await waitForBackend(PORT)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
