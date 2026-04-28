import { app, BrowserWindow, shell } from 'electron'
import http from 'http'
import path from 'path'
import { fork, ChildProcess } from 'child_process'

// ── Constants ──────────────────────────────────────────────────────────────────

const isDev  = !app.isPackaged
const PORT   = Number(process.env.PORT) || 3002
const DEV_URL  = 'http://localhost:5176/dinaxis/' // Vite dev server
const PROD_URL = `http://localhost:${PORT}/dinaxis/`

let backendProcess: ChildProcess | null = null

// ── Backend startup (production only) ─────────────────────────────────────────

async function startBackend(): Promise<void> {
  if (isDev) return // dev: backend is started separately via `npm run dev`

  const userData         = app.getPath('userData')
  const databaseUrl      = path.join(userData, 'dinaxis.db')
  const fsStorageDir     = path.join(userData, 'documents')
  const staticRoot       = path.join(process.resourcesPath, 'frontend', 'dist')
  const serverEntry      = path.join(process.resourcesPath, 'backend', 'dist', 'server.js')

  backendProcess = fork(serverEntry, [], {
    env: {
      ...process.env,
      PORT:           String(PORT),
      NODE_ENV:       'production',
      DATABASE_URL:   databaseUrl,
      STORAGE:        'filesystem',
      FS_STORAGE_DIR: fsStorageDir,
      SERVE_STATIC:   'true',
      STATIC_ROOT:    staticRoot,
    },
    // server.js is CommonJS compiled output — fork works directly
    silent: false,
  })

  backendProcess.on('error', (err) => {
    console.error('[electron] Backend process error:', err)
  })

  backendProcess.on('exit', (code) => {
    console.log(`[electron] Backend process exited with code ${code}`)
  })
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
    minWidth: 1100,
    minHeight: 700,
    title: 'Dinaxis',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
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
  // Kill the backend child process before quitting
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
  if (process.platform !== 'darwin') app.quit()
})
