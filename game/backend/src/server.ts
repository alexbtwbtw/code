import 'dotenv/config'
import { serve } from '@hono/node-server'
import type { Server } from 'http'
import app from './index'
import { setupWebSocketServer } from './ws'

const port = Number(process.env.PORT) || 3001

// serve() returns the underlying http.Server (ServerType).
// We attach the WebSocket server to the same port so WS connections
// on ws://host/ are handled alongside the Hono HTTP routes.
const httpServer = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Game server running at http://localhost:${info.port}`)
  console.log(`WebSocket server running at ws://localhost:${info.port}`)
}) as Server

setupWebSocketServer(httpServer)
