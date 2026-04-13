import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim() }
  catch { return 'unknown' }
})()

export default defineConfig({
  define: {
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, '../backend/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@mlightcad/libredwg-web'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/trpc': 'http://localhost:3000',
    },
  },
  appType: 'spa',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
})
