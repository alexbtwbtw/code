import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@backend': path.resolve(__dirname, '../backend/src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/trpc': 'http://localhost:3000',
    },
  },
  appType: 'spa',
})
