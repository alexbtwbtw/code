import { WebSocket } from 'ws'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Player = { id: string; name: string; ws: WebSocket }

export type GameRoom = {
  id: string
  player1: Player
  player2: Player
  state: 'waiting' | 'countdown' | 'playing' | 'ended'
  ready: Set<string>
  scores: Record<string, number>
  startTime?: number
  endTime?: number
  countdownTimer?: ReturnType<typeof setInterval>
  gameTimer?: ReturnType<typeof setTimeout>
  spectators: Set<WebSocket>
}

export type Msg =
  | { type: 'join'; name: string }
  | { type: 'challenge'; targetId: string }
  | { type: 'challenge_response'; challengerId: string; accepted: boolean }
  | { type: 'ready'; gameId: string }
  | { type: 'click'; gameId: string }
  | { type: 'spectate'; gameId: string }
