import { WebSocket } from 'ws'
import type { Player, GameRoom } from './types'

// ── In-memory state ───────────────────────────────────────────────────────────

export const players = new Map<string, Player>()           // id → Player
export const wsByPlayer = new Map<WebSocket, string>()      // ws → id
export const rooms = new Map<string, GameRoom>()           // roomId → GameRoom
export const playerRoom = new Map<string, string>()        // playerId → roomId

// ── Pending challenges ────────────────────────────────────────────────────────

// challengerId → targetId
export const pendingChallenges = new Map<string, string>()
