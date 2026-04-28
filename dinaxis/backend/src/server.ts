import 'dotenv/config'
import { serve } from '@hono/node-server'
import app from './index'
import { db } from './db'

const port = Number(process.env.PORT) || 3002

async function main() {
  const count = (db.prepare('SELECT COUNT(*) as n FROM claims').get() as { n: number }).n
  if (count === 0) {
    const { seed } = await import('./seed')
    await seed()
  } else {
    console.log(`DB already populated (${count} claims) — skipping seed`)
  }
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[dinaxis] Server running at http://localhost:${info.port}`)
  })
}

main().catch(err => { console.error('Startup failed:', err); process.exit(1) })
