import { WebSocket } from 'ws'
import { rooms, playerRoom } from './state'
import { send } from './lobby'
import type { GameRoom } from './types'

// ── Click rate limiting ───────────────────────────────────────────────────────

const clickWindows = new Map<string, number[]>() // playerId → timestamps

function isClickAllowed(playerId: string): boolean {
  const now = Date.now()
  const window = (clickWindows.get(playerId) ?? []).filter(t => now - t < 1000)
  if (window.length >= 20) return false
  window.push(now)
  clickWindows.set(playerId, window)
  return true
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function broadcastRoom(room: GameRoom, msg: object) {
  send(room.player1.ws, msg)
  send(room.player2.ws, msg)
  for (const spec of room.spectators) {
    send(spec, msg)
  }
}

export function getRoomGameState(room: GameRoom) {
  return {
    type: 'game_state',
    gameId: room.id,
    state: room.state,
    scores: room.scores,
    ready: Array.from(room.ready),
    player1Id: room.player1.id,
    player1Name: room.player1.name,
    player2Id: room.player2.id,
    player2Name: room.player2.name,
  }
}

// ── endGame ───────────────────────────────────────────────────────────────────

export function endGame(room: GameRoom) {
  room.state = 'ended'
  room.endTime = Date.now()

  if (room.countdownTimer) {
    clearInterval(room.countdownTimer)
    room.countdownTimer = undefined
  }
  if (room.gameTimer) {
    clearTimeout(room.gameTimer)
    room.gameTimer = undefined
  }

  const s1 = room.scores[room.player1.id] ?? 0
  const s2 = room.scores[room.player2.id] ?? 0
  let winnerId: string | null = null
  if (s1 > s2) winnerId = room.player1.id
  else if (s2 > s1) winnerId = room.player2.id
  // else tie → null

  broadcastRoom(room, {
    type: 'game_end',
    gameId: room.id,
    scores: room.scores,
    winnerId,
  })

  // Keep room for 30s so late spectators can still see the result, then delete
  setTimeout(() => {
    rooms.delete(room.id)
    playerRoom.delete(room.player1.id)
    playerRoom.delete(room.player2.id)
  }, 30_000)
}

// ── startCountdown ────────────────────────────────────────────────────────────

export function startCountdown(room: GameRoom) {
  room.state = 'countdown'
  let count = 3

  broadcastRoom(room, { ...getRoomGameState(room), countdown: count })

  room.countdownTimer = setInterval(() => {
    count--
    if (count > 0) {
      broadcastRoom(room, { ...getRoomGameState(room), countdown: count })
    } else {
      clearInterval(room.countdownTimer!)
      room.countdownTimer = undefined
      room.state = 'playing'
      room.startTime = Date.now()
      broadcastRoom(room, getRoomGameState(room))

      // End after 30 seconds
      room.gameTimer = setTimeout(() => endGame(room), 30_000)
    }
  }, 1_000)
}

// ── handleReady ───────────────────────────────────────────────────────────────

export function handleReady(
  _ws: WebSocket,
  msg: Record<string, unknown>,
  playerId: string,
) {
  if (typeof msg.gameId !== 'string') return

  const room = rooms.get(msg.gameId)
  if (!room) return
  if (room.player1.id !== playerId && room.player2.id !== playerId) return
  if (room.state !== 'waiting') return

  room.ready.add(playerId)
  broadcastRoom(room, getRoomGameState(room))

  if (room.ready.has(room.player1.id) && room.ready.has(room.player2.id)) {
    startCountdown(room)
  }
}

// ── handleClick ───────────────────────────────────────────────────────────────

export function handleClick(
  _ws: WebSocket,
  msg: Record<string, unknown>,
  playerId: string,
) {
  if (typeof msg.gameId !== 'string') return

  const room = rooms.get(msg.gameId)
  if (!room) return
  if (room.state !== 'playing') return
  if (room.player1.id !== playerId && room.player2.id !== playerId) return

  if (!isClickAllowed(playerId)) return

  room.scores[playerId] = (room.scores[playerId] ?? 0) + 1
  broadcastRoom(room, getRoomGameState(room))
}

// ── handleSpectate ────────────────────────────────────────────────────────────

export function handleSpectate(
  ws: WebSocket,
  msg: Record<string, unknown>,
) {
  if (typeof msg.gameId !== 'string') return

  const room = rooms.get(msg.gameId)
  if (!room) return
  room.spectators.add(ws)
  // Send current state to the new spectator
  send(ws, getRoomGameState(room))
}
