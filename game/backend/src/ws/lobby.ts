import { WebSocket } from 'ws'
import { randomUUID } from 'crypto'
import { players, wsByPlayer, rooms, playerRoom, pendingChallenges, pendingChallengeSettings } from './state'
import { broadcastRoom, getRoomGameState } from './game'
import type { Player, GameRoom, GameSettings } from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function send(ws: WebSocket, msg: object): void {
  if (ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify(msg))
  } catch (e) {
    console.error('[ws] send error:', e)
  }
}

export function defaultSettings(): GameSettings {
  return {
    duration: 30,
    movingButton: false,
    moveSpeed: 150,
    buttonSize: 'normal',
    ghostMode: false,
    shrinkMode: false,
    gravityMode: false,
    hotZone: false,
    bombMode: false,
  }
}

function parseSettings(raw: unknown): GameSettings {
  const defaults = defaultSettings()
  if (!raw || typeof raw !== 'object') return defaults
  const r = raw as Record<string, unknown>

  const validDurations = [15, 30, 45, 60] as const
  const duration = validDurations.includes(r.duration as (typeof validDurations)[number])
    ? (r.duration as GameSettings['duration'])
    : defaults.duration

  const rawMoveSpeed = typeof r.moveSpeed === 'number' ? r.moveSpeed : defaults.moveSpeed
  const moveSpeed = Math.round(Math.max(50, Math.min(500, rawMoveSpeed)) / 10) * 10

  const validButtonSizes = ['tiny', 'small', 'normal', 'large'] as const
  const buttonSize = validButtonSizes.includes(r.buttonSize as (typeof validButtonSizes)[number])
    ? (r.buttonSize as GameSettings['buttonSize'])
    : defaults.buttonSize

  return {
    duration,
    movingButton: typeof r.movingButton === 'boolean' ? r.movingButton : defaults.movingButton,
    moveSpeed,
    buttonSize,
    ghostMode: typeof r.ghostMode === 'boolean' ? r.ghostMode : defaults.ghostMode,
    shrinkMode: typeof r.shrinkMode === 'boolean' ? r.shrinkMode : defaults.shrinkMode,
    gravityMode: typeof r.gravityMode === 'boolean' ? r.gravityMode : defaults.gravityMode,
    hotZone: typeof r.hotZone === 'boolean' ? r.hotZone : defaults.hotZone,
    bombMode: typeof r.bombMode === 'boolean' ? r.bombMode : defaults.bombMode,
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

  // Parse and store settings
  const settings = parseSettings(msg.settings)
  pendingChallengeSettings.set(playerId, settings)

  // Record pending challenge (overwrite any prior challenge from this player)
  pendingChallenges.set(playerId, target.id)

  send(target.ws, {
    type: 'challenge_received',
    challengerId: playerId,
    challengerName: player.name,
    settings,
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

  // Retrieve and remove the challenger's settings
  const settings = pendingChallengeSettings.get(challengerId) ?? defaultSettings()
  pendingChallengeSettings.delete(challengerId)

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
    settings,
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
    settings,
  })

  send(challenger.ws, gameStartMsg(player))
  send(player.ws, gameStartMsg(challenger))

  // Immediately broadcast game_state so both players receive player1Id/player2Id
  // and can show the player view without waiting for the first ready/click.
  broadcastRoom(room, getRoomGameState(room))
}
