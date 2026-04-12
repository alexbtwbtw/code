import { defineConfig } from '@playwright/test'
import path from 'path'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  webServer: [
    {
      command: 'node node_modules/tsx/dist/cli.mjs src/server.ts',
      cwd: path.resolve(__dirname, '../backend'),
      port: 3000,
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        USE_REAL_AI: 'false',
      },
    },
    {
      command: 'node node_modules/vite/bin/vite.js --port 5173',
      cwd: path.resolve(__dirname, '../frontend'),
      port: 5173,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
