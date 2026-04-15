import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { wsByPlayer, rooms } from './state'
import { handleJoin, handleChallenge, handleChallengeResponse } from './lobby'
import { handleReady, handleClick, handleBomb, handleSpectate } from './game'
import { cleanupPlayer } from './cleanup'

// ── Input validation guard ────────────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// ── Message dispatcher ────────────────────────────────────────────────────────

function handleMessage(ws: WebSocket, raw: string) {
  let msg: unknown
  try {
    msg = JSON.parse(raw)
  } catch {
    return // silently drop unparseable messages
  }

  if (!isObject(msg)) return
  if (typeof msg.type !== 'string') return

  const playerId = wsByPlayer.get(ws)

  if (msg.type === 'join') {
    // join requires name: string
    if (typeof msg.name !== 'string') return
    handleJoin(ws, msg)
    return
  }

  // All other messages require a registered player
  if (!playerId) return

  switch (msg.type) {
    case 'challenge': {
      if (typeof msg.targetId !== 'string') return
      handleChallenge(ws, msg, playerId)
      break
    }

    case 'challenge_response': {
      if (typeof msg.challengerId !== 'string') return
      if (typeof msg.accepted !== 'boolean') return
      handleChallengeResponse(ws, msg, playerId)
      break
    }

    case 'ready': {
      if (typeof msg.gameId !== 'string') return
      handleReady(ws, msg, playerId)
      break
    }

    case 'click': {
      if (typeof msg.gameId !== 'string') return
      handleClick(ws, msg, playerId)
      break
    }

    case 'bomb': {
      if (typeof msg.gameId !== 'string') return
      handleBomb(ws, msg, playerId)
      break
    }

    case 'spectate': {
      if (typeof msg.gameId !== 'string') return
      handleSpectate(ws, msg)
      break
    }

    // Silently drop unknown message types
  }
}

// ── Export setup function ─────────────────────────────────────────────────────

export function setupWebSocketServer(server: import('http').Server) {
  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    ws.on('message', (data) => {
      handleMessage(ws, data.toString())
    })

    ws.on('close', () => {
      const id = wsByPlayer.get(ws)
      if (id) cleanupPlayer(id, ws)
      else wsByPlayer.delete(ws)
    })

    ws.on('error', () => {
      const id = wsByPlayer.get(ws)
      if (id) cleanupPlayer(id, ws)
      else wsByPlayer.delete(ws)
    })
  })

  return wss
}

// Expose rooms for potential future use (e.g., REST endpoint)
export { rooms }
