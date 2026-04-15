import { WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import { players, wsByPlayer, rooms, playerRoom, pendingChallenges } from './state'
import type { Player, GameRoom } from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function send(ws: WebSocket, msg: object): void {
  if (ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify(msg))
  } catch (e) {
    console.error('[ws] send error:', e)
  }
}

export function broadcastLobby() {
  const users = Array.from(players.values()).map(p => ({ id: p.id, name: p.name }))
  for (const player of players.values()) {
    send(player.ws, { type: 'lobby', users })
  }
}

// ── handleJoin ────────────────────────────────────────────────────────────────

export function handleJoin(ws: WebSocket, msg: Record<string, unknown>) {
  // Validate name field
  if (typeof msg.name !== 'string') return

  // Sanitise: strip non-printable / non-ASCII, trim, cap at 30 chars
  const name = String(msg.name ?? '').replace(/[^\x20-\x7E]/g, '').trim().slice(0, 30)
  if (!name) return

  const existingId = wsByPlayer.get(ws)
  const id = existingId ?? randomUUID()

  const player: Player = { id, name, ws }
  players.set(id, player)
  wsByPlayer.set(ws, id)

  send(ws, { type: 'assigned_id', id })
  broadcastLobby()
}

// ── handleChallenge ───────────────────────────────────────────────────────────

export function handleChallenge(
  ws: WebSocket,
  msg: Record<string, unknown>,
  playerId: string,
) {
  if (typeof msg.targetId !== 'string') return

  const player = players.get(playerId)
  if (!player) return

  const target = players.get(msg.targetId)
  if (!target || target.id === playerId) return

  // Reject if either player is already in a room
  if (playerRoom.has(playerId) || playerRoom.has(target.id)) return

  // Record pending challenge (overwrite any prior challenge from this player)
  pendingChallenges.set(playerId, target.id)

  send(target.ws, {
    type: 'challenge_received',
    challengerId: playerId,
    challengerName: player.name,
  })
}

// ── handleChallengeResponse ───────────────────────────────────────────────────

export function handleChallengeResponse(
  ws: WebSocket,
  msg: Record<string, unknown>,
  playerId: string,
) {
  if (typeof msg.challengerId !== 'string') return
  if (typeof msg.accepted !== 'boolean') return

  const challengerId = msg.challengerId
  const challenger = players.get(challengerId)
  if (!challenger) return

  // Validate there is actually a pending challenge from challengerId to playerId
  if (pendingChallenges.get(challengerId) !== playerId) return
  pendingChallenges.delete(challengerId)

  const player = players.get(playerId)
  if (!player) return

  if (!msg.accepted) {
    send(challenger.ws, { type: 'challenge_declined', targetId: playerId })
    return
  }

  // Reject if either player is already in a room
  if (playerRoom.has(challengerId) || playerRoom.has(playerId)) return

  // Create room
  const gameId = randomUUID()
  const room: GameRoom = {
    id: gameId,
    player1: challenger,
    player2: player,
    state: 'waiting',
    ready: new Set(),
    scores: { [challenger.id]: 0, [player.id]: 0 },
    spectators: new Set(),
  }
  rooms.set(gameId, room)
  playerRoom.set(challenger.id, gameId)
  playerRoom.set(player.id, gameId)

  const gameStartMsg = (opponent: Player) => ({
    type: 'game_start',
    gameId,
    opponentId: opponent.id,
    opponentName: opponent.name,
  })

  send(challenger.ws, gameStartMsg(player))
  send(player.ws, gameStartMsg(challenger))
}
