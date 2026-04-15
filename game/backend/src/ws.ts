import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { randomUUID } from 'crypto'

// ── Types ────────────────────────────────────────────────────────────────────

type Player = { id: string; name: string; ws: WebSocket }

type GameRoom = {
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

// ── In-memory state ───────────────────────────────────────────────────────────

const players = new Map<string, Player>()           // id → Player
const wsByPlayer = new Map<WebSocket, string>()      // ws → id
const rooms = new Map<string, GameRoom>()           // roomId → GameRoom
const playerRoom = new Map<string, string>()        // playerId → roomId

// ── Helpers ───────────────────────────────────────────────────────────────────

function send(ws: WebSocket, msg: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

function broadcastLobby() {
  const users = Array.from(players.values()).map(p => ({ id: p.id, name: p.name }))
  for (const player of players.values()) {
    send(player.ws, { type: 'lobby', users })
  }
}

function broadcastRoom(room: GameRoom, msg: unknown) {
  send(room.player1.ws, msg)
  send(room.player2.ws, msg)
  for (const spec of room.spectators) {
    send(spec, msg)
  }
}

function getRoomGameState(room: GameRoom) {
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

function endGame(room: GameRoom) {
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
}

function startCountdown(room: GameRoom) {
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

function cleanupPlayer(id: string) {
  const player = players.get(id)
  if (!player) return

  players.delete(id)
  wsByPlayer.delete(player.ws)

  // Remove from any game room
  const roomId = playerRoom.get(id)
  if (roomId) {
    const room = rooms.get(roomId)
    if (room) {
      // End game if it was in progress
      if (room.state === 'playing' || room.state === 'countdown') {
        if (room.countdownTimer) clearInterval(room.countdownTimer)
        if (room.gameTimer) clearTimeout(room.gameTimer)
        room.state = 'ended'
        const otherId = room.player1.id === id ? room.player2.id : room.player1.id
        broadcastRoom(room, {
          type: 'game_end',
          gameId: room.id,
          scores: room.scores,
          winnerId: otherId,
        })
      }
      // Notify spectators and the other player
      rooms.delete(roomId)
    }
    playerRoom.delete(id)
  }

  broadcastLobby()
}

// ── Message handlers ──────────────────────────────────────────────────────────

type Msg =
  | { type: 'join'; name: string }
  | { type: 'challenge'; targetId: string }
  | { type: 'challenge_response'; challengerId: string; accepted: boolean }
  | { type: 'ready'; gameId: string }
  | { type: 'click'; gameId: string }
  | { type: 'spectate'; gameId: string }

function handleMessage(ws: WebSocket, raw: string) {
  let msg: Msg
  try {
    msg = JSON.parse(raw) as Msg
  } catch {
    return
  }

  const playerId = wsByPlayer.get(ws)

  if (msg.type === 'join') {
    // Allow re-join (name update) or fresh join
    const name = String(msg.name ?? '').trim().slice(0, 50) || 'Anonymous'
    const id = playerId ?? randomUUID()

    const player: Player = { id, name, ws }
    players.set(id, player)
    wsByPlayer.set(ws, id)

    send(ws, { type: 'assigned_id', id })
    broadcastLobby()
    return
  }

  // All other messages require a registered player
  if (!playerId) return
  const player = players.get(playerId)
  if (!player) return

  switch (msg.type) {
    case 'challenge': {
      const target = players.get(msg.targetId)
      if (!target || target.id === playerId) return
      send(target.ws, {
        type: 'challenge_received',
        challengerId: playerId,
        challengerName: player.name,
      })
      break
    }

    case 'challenge_response': {
      const challenger = players.get(msg.challengerId)
      if (!challenger) return

      if (!msg.accepted) {
        send(challenger.ws, { type: 'challenge_declined', targetId: playerId })
        return
      }

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
      break
    }

    case 'ready': {
      const room = rooms.get(msg.gameId)
      if (!room) return
      if (room.player1.id !== playerId && room.player2.id !== playerId) return
      if (room.state !== 'waiting') return

      room.ready.add(playerId)
      broadcastRoom(room, getRoomGameState(room))

      if (room.ready.has(room.player1.id) && room.ready.has(room.player2.id)) {
        startCountdown(room)
      }
      break
    }

    case 'click': {
      const room = rooms.get(msg.gameId)
      if (!room) return
      if (room.state !== 'playing') return
      if (room.player1.id !== playerId && room.player2.id !== playerId) return

      room.scores[playerId] = (room.scores[playerId] ?? 0) + 1
      broadcastRoom(room, getRoomGameState(room))
      break
    }

    case 'spectate': {
      const room = rooms.get(msg.gameId)
      if (!room) return
      room.spectators.add(ws)
      // Send current state to the new spectator
      send(ws, getRoomGameState(room))
      break
    }
  }
}

// ── Export setup function ────────────────────────────────────────────────────

export function setupWebSocketServer(server: import('http').Server) {
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    ws.on('message', (data) => {
      handleMessage(ws, data.toString())
    })

    ws.on('close', () => {
      const id = wsByPlayer.get(ws)
      if (id) cleanupPlayer(id)
      else wsByPlayer.delete(ws)
    })

    ws.on('error', () => {
      const id = wsByPlayer.get(ws)
      if (id) cleanupPlayer(id)
      else wsByPlayer.delete(ws)
    })
  })

  return wss
}

// Expose rooms for potential future use (e.g., REST endpoint)
export { rooms }
