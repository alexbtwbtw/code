/**
 * Assembles the COBA Electron app without electron-builder.
 * Copies the Electron binary from node_modules, drops in our app code,
 * backend build, and frontend build — no asar packing, no code signing.
 *
 * Output: dist-electron/win-unpacked/
 */

import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.resolve(__dirname, '..')
const outDir    = path.join(root, 'dist-electron', 'win-unpacked')
const resDir    = path.join(outDir, 'resources')
const appDir    = path.join(resDir, 'app')

// ── Helpers ────────────────────────────────────────────────────────────────────

async function copyDir(src, dest, excludes = []) {
  await fsp.mkdir(dest, { recursive: true })
  const entries = await fsp.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    if (excludes.some(ex => entry.name === ex || entry.name.startsWith(ex))) continue
    const srcPath  = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, excludes)
    } else {
      await fsp.copyFile(srcPath, destPath)
    }
  }
}

function log(msg) { console.log(`  • ${msg}`) }

// ── Main ───────────────────────────────────────────────────────────────────────

console.log('\nAssembling COBA Electron app...\n')

// 1. Clean output
if (fs.existsSync(outDir)) {
  log('cleaning previous build...')
  fs.rmSync(outDir, { recursive: true, force: true })
}

// 2. Copy Electron binary distribution
log('copying Electron runtime...')
const electronDist = path.join(root, 'node_modules', 'electron', 'dist')
await copyDir(electronDist, outDir)

// Rename electron.exe → COBA.exe
if (fs.existsSync(path.join(outDir, 'electron.exe'))) {
  await fsp.rename(path.join(outDir, 'electron.exe'), path.join(outDir, 'COBA.exe'))
}

// 3. Create resources/app/ structure
await fsp.mkdir(appDir, { recursive: true })

// 4. Write a minimal package.json so Electron loads main.js
log('writing app manifest...')
await fsp.writeFile(path.join(appDir, 'package.json'), JSON.stringify({
  name: 'coba',
  version: '1.0.0',
  main: 'main.js',
}, null, 2))

// 5. Copy compiled Electron main
log('copying Electron main...')
await fsp.copyFile(
  path.join(root, 'electron-dist', 'main.js'),
  path.join(appDir, 'main.js'),
)

// 6. Copy backend dist
log('copying backend...')
await copyDir(
  path.join(root, 'backend', 'dist'),
  path.join(resDir, 'backend', 'dist'),
)

// 7. Copy backend node_modules (excluding dev-only packages)
log('copying backend node_modules (production only)...')
const DEV_PACKAGES = new Set(['@esbuild', 'esbuild', 'tsx', 'typescript', '@types'])
await copyDir(
  path.join(root, 'backend', 'node_modules'),
  path.join(resDir, 'backend', 'node_modules'),
  [...DEV_PACKAGES],
)

// 8. Copy frontend build
log('copying frontend dist...')
await copyDir(
  path.join(root, 'frontend', 'dist'),
  path.join(resDir, 'frontend', 'dist'),
)

console.log(`\n✓ Done!  →  ${outDir}\n`)
console.log('  To launch: dist-electron\\win-unpacked\\COBA.exe\n')
