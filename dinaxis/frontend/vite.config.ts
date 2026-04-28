import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/dinaxis/',
  plugins: [react()],
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, '../backend/src'),
    },
  },
  server: {
    port: 5176,
    proxy: {
      '/api': 'http://localhost:3002',
      '/trpc': 'http://localhost:3002',
    },
  },
  appType: 'spa',
})
