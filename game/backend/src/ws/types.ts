import { WebSocket } from 'ws'

// ── Types ─────────────────────────────────────────────────────────────────────

export type Player = { id: string; name: string; ws: WebSocket }

export type GameSettings = {
  duration: 15 | 30 | 45 | 60
  movingButton: boolean
  moveSpeed: number  // pixels per second, range 50–500, default 150
  buttonSize: 'tiny' | 'small' | 'normal' | 'large'
  ghostMode: boolean
  shrinkMode: boolean
  gravityMode: boolean
  hotZone: boolean
  bombMode: boolean
}

export type GameRoom = {
  id: string
  player1: Player
  player2: Player
  state: 'waiting' | 'countdown' | 'playing' | 'ended'
  ready: Set<string>
  scores: Record<string, number>
  settings: GameSettings
  startTime?: number
  endTime?: number
  countdownTimer?: ReturnType<typeof setInterval>
  gameTimer?: ReturnType<typeof setTimeout>
  spectators: Set<WebSocket>
}

export type Msg =
  | { type: 'join'; name: string }
  | { type: 'challenge'; targetId: string; settings?: GameSettings }
  | { type: 'challenge_response'; challengerId: string; accepted: boolean }
  | { type: 'ready'; gameId: string }
  | { type: 'click'; gameId: string }
  | { type: 'bomb'; gameId: string }
  | { type: 'spectate'; gameId: string }
