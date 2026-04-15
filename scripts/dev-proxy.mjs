import http from 'http'
import net from 'net'

const PORT = 8080

const routes = [
  { prefix: '/api',       target: { host: 'localhost', port: 3000 } },
  { prefix: '/trpc',      target: { host: 'localhost', port: 3000 } },
  { prefix: '/game/api',  target: { host: 'localhost', port: 3001 } },
  { prefix: '/game/trpc', target: { host: 'localhost', port: 3001 } },
  // WebSocket connections for the multiplayer game arrive at /game/ws.
  // The game backend (port 3001) runs both the Hono HTTP server and the
  // ws.WebSocketServer on the same underlying http.Server, so WS upgrades
  // to /game/ws are forwarded directly to port 3001 — no separate WS port
  // is needed. The generic upgrade handler below tunnels them correctly.
  { prefix: '/game/ws',   target: { host: 'localhost', port: 3001 } },
  { prefix: '/game',      target: { host: 'localhost', port: 5174 } },
  { prefix: '/coba',      target: { host: 'localhost', port: 5173 } },
  { prefix: '/',          target: { host: 'localhost', port: 5175 } },
]

function resolveTarget(url) {
  // Sort by prefix length descending to match most-specific first
  const sorted = [...routes].sort((a, b) => b.prefix.length - a.prefix.length)
  for (const route of sorted) {
    if (url === route.prefix || url.startsWith(route.prefix + '/') || url.startsWith(route.prefix + '?')) {
      return route.target
    }
    // Handle exact prefix match for root
    if (route.prefix === '/' ) {
      return route.target
    }
  }
  return routes[routes.length - 1].target
}

const server = http.createServer((req, res) => {
  const url = req.url || '/'
  const target = resolveTarget(url)

  const options = {
    hostname: target.host,
    port: target.port,
    path: url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${target.host}:${target.port}`,
    },
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res, { end: true })
  })

  proxyReq.on('error', (err) => {
    console.error(`[proxy] Error forwarding ${url} to :${target.port} — ${err.message}`)
    if (!res.headersSent) {
      res.writeHead(502)
    }
    res.end(`Bad Gateway: ${err.message}`)
  })

  req.pipe(proxyReq, { end: true })
})

// WebSocket / HMR upgrade handling
// This generic tunnel forwards WS upgrades to the resolved target port.
// For /game/ws → port 3001 (game backend WS server on the same HTTP server).
// For /game/* HMR → port 5174 (Vite dev server).
server.on('upgrade', (req, socket, head) => {
  const url = req.url || '/'
  const target = resolveTarget(url)

  const conn = net.createConnection({ host: target.host, port: target.port }, () => {
    // Forward the upgrade request headers
    const headers = [
      `${req.method} ${url} HTTP/${req.httpVersion}`,
      ...Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`),
      '',
      '',
    ].join('\r\n')

    conn.write(headers)
    if (head && head.length) conn.write(head)

    socket.pipe(conn)
    conn.pipe(socket)
  })

  conn.on('error', (err) => {
    console.error(`[proxy] WS upgrade error for ${url} to :${target.port} — ${err.message}`)
    socket.destroy()
  })

  socket.on('error', () => conn.destroy())
})

server.listen(PORT, () => {
  console.log(`\n[dev-proxy] Listening on http://localhost:${PORT}\n`)
  console.log('Routes (most-specific first):')
  console.log(`  /api/*       → http://localhost:3000  (COBA backend)`)
  console.log(`  /trpc/*      → http://localhost:3000  (COBA backend)`)
  console.log(`  /game/api/*  → http://localhost:3001  (Game backend)`)
  console.log(`  /game/trpc/* → http://localhost:3001  (Game backend)`)
  console.log(`  /game/ws     → ws://localhost:3001    (Game WS server, same port as backend)`)
  console.log(`  /game/*      → http://localhost:5174  (Game Vite)`)
  console.log(`  /coba/*      → http://localhost:5173  (COBA Vite)`)
  console.log(`  /*           → http://localhost:5175  (Home Vite)`)
  console.log()
})
