import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/game/',
  server: {
    port: 5174,
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
