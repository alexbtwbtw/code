import 'dotenv/config'
import { serve } from '@hono/node-server'
import app from './index'

const port = Number(process.env.PORT) || 3001

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Game server running at http://localhost:${info.port}`)
})
