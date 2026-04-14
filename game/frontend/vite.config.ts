import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/game/',
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, '../backend/src'),
    },
  },
  server: {
    proxy: {
      '/game/api': {
        target: 'http://localhost:3001',
        rewrite: (p) => p.replace(/^\/game/, ''),
      },
      '/game/trpc': {
        target: 'http://localhost:3001',
        rewrite: (p) => p.replace(/^\/game/, ''),
      },
    },
  },
  appType: 'spa',
})
