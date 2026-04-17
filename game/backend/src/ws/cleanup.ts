import { WebSocket } from 'ws'
import { players, wsByPlayer, rooms, playerRoom } from './state'
import { broadcastLobby } from './lobby'
import { broadcastRoom } from './game'

// ── cleanupPlayer ─────────────────────────────────────────────────────────────

export function cleanupPlayer(id: string, ws: WebSocket) {
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
      // Notify spectators and the other player, then clean up both room entries
      const otherId = room.player1.id === id ? room.player2.id : room.player1.id
      rooms.delete(roomId)
      playerRoom.delete(otherId)
    }
    playerRoom.delete(id)
  }

  // Remove the disconnected ws from all room spectator sets
  for (const room of rooms.values()) {
    room.spectators.delete(ws)
  }

  broadcastLobby()
}
