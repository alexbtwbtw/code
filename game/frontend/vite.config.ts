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
      // WebSocket proxy for the multiplayer game server.
      // Vite's proxy handles WS upgrades automatically when ws: true.
      // The game backend runs on port 3001 and the WS server is mounted
      // on the same HTTP server, so the same target handles both.
      '/game/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        rewrite: (p) => p.replace(/^\/game/, ''),
      },
    },
  },
  appType: 'spa',
})
