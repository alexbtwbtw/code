import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { db } from '../db'

type ScoreRow = { id: number; player: string; score: number; createdAt: string }

export const scoresRouter = router({
  list: publicProcedure.query((): ScoreRow[] => {
    return db.prepare(`
      SELECT id, player, score, created_at as createdAt
      FROM scores ORDER BY score DESC LIMIT 10
    `).all() as ScoreRow[]
  }),

  add: publicProcedure
    .input(z.object({
      player: z.string().min(1).max(50),
      score:  z.number().int().min(0),
    }))
    .mutation(({ input }): { id: number } => {
      const result = db.prepare(
        'INSERT INTO scores (player, score) VALUES (?, ?)'
      ).run(input.player, input.score)
      return { id: Number(result.lastInsertRowid) }
    }),
})
