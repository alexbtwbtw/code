/**
 * Unit tests for the WS multiplayer state machine.
 *
 * We mock ws.WebSocket and drive the handlers directly — no real network needed.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WebSocket } from 'ws'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeMockWs(): WebSocket {
  return {
    readyState: WebSocket.OPEN,
    send: vi.fn(),
  } as unknown as WebSocket
}

/** Parse all messages sent via ws.send mock and return them as objects */
function sentMessages(ws: WebSocket): unknown[] {
  const mock = (ws.send as ReturnType<typeof vi.fn>)
  return mock.mock.calls.map(([raw]: [string]) => JSON.parse(raw))
}

/** Find the last message of a given type sent to a ws */
function lastMsg(ws: WebSocket, type: string): Record<string, unknown> | undefined {
  return sentMessages(ws).filter((m: any) => m.type === type).at(-1) as any
}

// ── State reset between tests ──────────────────────────────────────────────────

// We import state directly so we can clear it between tests
import { players, wsByPlayer, rooms, playerRoom, pendingChallenges, pendingChallengeSettings } from '../state'
import { handleJoin, handleChallenge, handleChallengeResponse, broadcastLobby } from '../lobby'
import { handleReady, handleClick, handleBomb, handleSpectate, endGame, startCountdown } from '../game'
import { cleanupPlayer } from '../cleanup'

beforeEach(() => {
  players.clear()
  wsByPlayer.clear()
  rooms.clear()
  playerRoom.clear()
  pendingChallenges.clear()
  pendingChallengeSettings.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── Join ───────────────────────────────────────────────────────────────────────

describe('handleJoin', () => {
  it('registers a player and sends assigned_id + lobby', () => {
    const ws = makeMockWs()
    handleJoin(ws, { name: 'Alice' })

    expect(players.size).toBe(1)
    expect(wsByPlayer.get(ws)).toBeDefined()

    const assignedId = lastMsg(ws, 'assigned_id')
    expect(assignedId).toBeTruthy()
    expect(typeof (assignedId as any).id).toBe('string')

    const lobby = lastMsg(ws, 'lobby')
    expect((lobby as any).users).toHaveLength(1)
    expect((lobby as any).users[0].name).toBe('Alice')
  })

  it('strips non-ASCII characters from name', () => {
    const ws = makeMockWs()
    handleJoin(ws, { name: 'Ál\x00ice' })
    const player = Array.from(players.values())[0]
    expect(player.name).toBe('lice') // 'Á' and \x00 stripped, then trimmed
  })

  it('strips non-printable characters and trims', () => {
    const ws = makeMockWs()
    handleJoin(ws, { name: '  \tBob\n  ' })
    const player = Array.from(players.values())[0]
    // \t and \n are non-printable (outside \x20–\x7E range)
    expect(player.name).toBe('Bob')
  })

  it('caps name at 30 characters', () => {
    const ws = makeMockWs()
    handleJoin(ws, { name: 'A'.repeat(50) })
    const player = Array.from(players.values())[0]
    expect(player.name).toHaveLength(30)
  })

  it('ignores empty or blank names', () => {
    const ws = makeMockWs()
    handleJoin(ws, { name: '   ' })
    expect(players.size).toBe(0)
  })

  it('ignores non-string name', () => {
    const ws = makeMockWs()
    handleJoin(ws, { name: 123 })
    expect(players.size).toBe(0)
  })

  it('re-joining same ws updates name', () => {
    const ws = makeMockWs()
    handleJoin(ws, { name: 'Alice' })
    const id1 = wsByPlayer.get(ws)!
    handleJoin(ws, { name: 'Alice2' })
    const id2 = wsByPlayer.get(ws)!
    expect(id1).toBe(id2) // same id reused
    expect(players.get(id2)!.name).toBe('Alice2')
  })

  it('broadcasts lobby to all connected players', () => {
    const ws1 = makeMockWs()
    const ws2 = makeMockWs()
    handleJoin(ws1, { name: 'Alice' })
    handleJoin(ws2, { name: 'Bob' })

    // Both should have received a lobby with 2 users
    const lobby1 = lastMsg(ws1, 'lobby') as any
    const lobby2 = lastMsg(ws2, 'lobby') as any
    expect(lobby1.users).toHaveLength(2)
    expect(lobby2.users).toHaveLength(2)
  })
})

// ── Challenge ──────────────────────────────────────────────────────────────────

function setupTwoPlayers() {
  const ws1 = makeMockWs()
  const ws2 = makeMockWs()
  handleJoin(ws1, { name: 'Alice' })
  handleJoin(ws2, { name: 'Bob' })
  const id1 = wsByPlayer.get(ws1)!
  const id2 = wsByPlayer.get(ws2)!
  return { ws1, ws2, id1, id2 }
}

describe('handleChallenge', () => {
  it('sends challenge_received to target', () => {
    const { ws1, ws2, id1, id2 } = setupTwoPlayers()
    handleChallenge(ws1, { targetId: id2 }, id1)

    const msg = lastMsg(ws2, 'challenge_received') as any
    expect(msg.challengerId).toBe(id1)
    expect(msg.challengerName).toBe('Alice')
  })

  it('records pending challenge', () => {
    const { ws1, id1, id2 } = setupTwoPlayers()
    handleChallenge(ws1, { targetId: id2 }, id1)
    expect(pendingChallenges.get(id1)).toBe(id2)
  })

  it('rejects self-challenge', () => {
    const { ws1, id1 } = setupTwoPlayers()
    handleChallenge(ws1, { targetId: id1 }, id1)
    expect(pendingChallenges.size).toBe(0)
  })

  it('rejects challenge if challenger is already in a room', () => {
    const { ws1, ws2, id1, id2 } = setupTwoPlayers()
    playerRoom.set(id1, 'some-room')
    handleChallenge(ws1, { targetId: id2 }, id1)
    expect(pendingChallenges.size).toBe(0)
  })

  it('rejects challenge if target is already in a room', () => {
    const { ws1, id1, id2 } = setupTwoPlayers()
    playerRoom.set(id2, 'some-room')
    handleChallenge(ws1, { targetId: id2 }, id1)
    expect(pendingChallenges.size).toBe(0)
  })
})

// ── Challenge Response ─────────────────────────────────────────────────────────

describe('handleChallengeResponse', () => {
  it('decline sends challenge_declined to challenger', () => {
    const { ws1, ws2, id1, id2 } = setupTwoPlayers()
    handleChallenge(ws1, { targetId: id2 }, id1)
    handleChallengeResponse(ws2, { challengerId: id1, accepted: false }, id2)

    const msg = lastMsg(ws1, 'challenge_declined') as any
    expect(msg.targetId).toBe(id2)
  })

  it('decline cleans up pendingChallenges', () => {
    const { ws1, ws2, id1, id2 } = setupTwoPlayers()
    handleChallenge(ws1, { targetId: id2 }, id1)
    handleChallengeResponse(ws2, { challengerId: id1, accepted: false }, id2)
    expect(pendingChallenges.size).toBe(0)
    expect(pendingChallengeSettings.size).toBe(0)
  })

  it('accept creates a room and sends game_start to both players', () => {
    const { ws1, ws2, id1, id2 } = setupTwoPlayers()
    handleChallenge(ws1, { targetId: id2 }, id1)
    handleChallengeResponse(ws2, { challengerId: id1, accepted: true }, id2)

    expect(rooms.size).toBe(1)
    expect(playerRoom.get(id1)).toBeDefined()
    expect(playerRoom.get(id2)).toBeDefined()

    const msg1 = lastMsg(ws1, 'game_start') as any
    const msg2 = lastMsg(ws2, 'game_start') as any
    expect(msg1.opponentId).toBe(id2)
    expect(msg2.opponentId).toBe(id1)
  })

  it('accept cleans up pendingChallenges and pendingChallengeSettings', () => {
    const { ws1, ws2, id1, id2 } = setupTwoPlayers()
    handleChallenge(ws1, { targetId: id2 }, id1)
    handleChallengeResponse(ws2, { challengerId: id1, accepted: true }, id2)
    expect(pendingChallenges.size).toBe(0)
    expect(pendingChallengeSettings.size).toBe(0)
  })

  it('ignores response with no matching pending challenge', () => {
    const { ws2, id1, id2 } = setupTwoPlayers()
    handleChallengeResponse(ws2, { challengerId: id1, accepted: true }, id2)
    expect(rooms.size).toBe(0)
  })

  it('[BUG FIX] cleans up pending state even when challenger has disconnected', () => {
    const { ws1, ws2, id1, id2 } = setupTwoPlayers()
    handleChallenge(ws1, { targetId: id2 }, id1)

    // Challenger disconnects
    cleanupPlayer(id1, ws1)
    expect(players.has(id1)).toBe(false)

    // pendingChallenges still has the stale entry before target responds
    // (it was set before disconnect; cleanupPlayer doesn't clear it)
    // Target now accepts — previously this would return early leaving the stale entry
    handleChallengeResponse(ws2, { challengerId: id1, accepted: true }, id2)

    // After fix: pendingChallenges is cleaned up regardless
    expect(pendingChallenges.size).toBe(0)
    expect(pendingChallengeSettings.size).toBe(0)
    // No room created because challenger is gone
    expect(rooms.size).toBe(0)
  })

  it('rejects accept if either player is already in a room', () => {
    const { ws1, ws2, id1, id2 } = setupTwoPlayers()
    handleChallenge(ws1, { targetId: id2 }, id1)
    playerRoom.set(id1, 'some-room')
    handleChallengeResponse(ws2, { challengerId: id1, accepted: true }, id2)
    // pendingChallenges should be cleared, but no new room created
    expect(pendingChallenges.size).toBe(0)
    expect(rooms.size).toBe(0)
  })
})

// ── Ready → Countdown → Game End ──────────────────────────────────────────────

function setupGame() {
  const { ws1, ws2, id1, id2 } = setupTwoPlayers()
  handleChallenge(ws1, { targetId: id2 }, id1)
  handleChallengeResponse(ws2, { challengerId: id1, accepted: true }, id2)
  const gameId = playerRoom.get(id1)!
  const room = rooms.get(gameId)!
  return { ws1, ws2, id1, id2, gameId, room }
}

describe('handleReady + startCountdown + endGame', () => {
  it('game_state is broadcast when one player sends ready', () => {
    const { ws1, id1, gameId } = setupGame()
    handleReady(ws1, { gameId }, id1)
    const msg = lastMsg(ws1, 'game_state') as any
    expect(msg.ready).toContain(id1)
  })

  it('starts countdown when both players are ready', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    expect(room.state).toBe('countdown')
  })

  it('sends countdown 3 immediately on both ready', () => {
    const { ws1, id1, id2, ws2, gameId } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    const msg = lastMsg(ws1, 'game_state') as any
    expect(msg.countdown).toBe(3)
  })

  it('transitions to playing state after countdown completes', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    // Advance through 3 countdown ticks (count-- each time until count==0)
    vi.advanceTimersByTime(3000)
    expect(room.state).toBe('playing')
  })

  it('ends game after configured duration', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000) // countdown
    expect(room.state).toBe('playing')
    vi.advanceTimersByTime(30_000) // game duration (default 30s)
    expect(room.state).toBe('ended')
  })

  it('sends game_end when game ends naturally', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000 + 30_000)
    const msg = lastMsg(ws1, 'game_end') as any
    expect(msg.gameId).toBe(gameId)
    expect(msg.winnerId).toBeNull() // tie (0-0)
  })

  it('cleans up room from rooms map after 30s post-game', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000 + 30_000)
    expect(rooms.has(gameId)).toBe(true) // still there for spectators
    vi.advanceTimersByTime(30_000) // 30s post-game delay
    expect(rooms.has(gameId)).toBe(false)
  })

  it('ignores ready from non-participant', () => {
    const ws3 = makeMockWs()
    handleJoin(ws3, { name: 'Charlie' })
    const id3 = wsByPlayer.get(ws3)!
    const { gameId, room } = setupGame()
    handleReady(ws3, { gameId }, id3)
    expect(room.ready.size).toBe(0)
  })

  it('ignores ready when game is not in waiting state', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    // State is now countdown; sending ready again should be a no-op
    room.ready.clear()
    handleReady(ws1, { gameId }, id1)
    expect(room.ready.size).toBe(0)
  })
})

// ── Click rate limiting ────────────────────────────────────────────────────────

describe('handleClick rate limiting', () => {
  it('increments score on valid click', () => {
    const { ws1, id1, id2, ws2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    handleClick(ws1, { gameId }, id1)
    expect(room.scores[id1]).toBe(1)
  })

  it('allows up to 20 clicks per second', () => {
    const { ws1, id1, id2, ws2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    for (let i = 0; i < 20; i++) handleClick(ws1, { gameId }, id1)
    expect(room.scores[id1]).toBe(20)
  })

  it('drops clicks beyond 20 per second', () => {
    const { ws1, id1, id2, ws2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    for (let i = 0; i < 25; i++) handleClick(ws1, { gameId }, id1)
    expect(room.scores[id1]).toBe(20)
  })

  it('rate limit resets after 1 second', () => {
    const { ws1, id1, id2, ws2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    for (let i = 0; i < 20; i++) handleClick(ws1, { gameId }, id1)
    expect(room.scores[id1]).toBe(20)
    vi.advanceTimersByTime(1001)
    handleClick(ws1, { gameId }, id1)
    expect(room.scores[id1]).toBe(21)
  })

  it('ignores clicks when game is not playing', () => {
    const { ws1, id1, gameId, room } = setupGame()
    handleClick(ws1, { gameId }, id1) // state is 'waiting'
    expect(room.scores[id1]).toBe(0)
  })

  it('ignores clicks from non-participants', () => {
    const ws3 = makeMockWs()
    handleJoin(ws3, { name: 'Charlie' })
    const id3 = wsByPlayer.get(ws3)!
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    handleClick(ws3, { gameId }, id3)
    expect(room.scores[id3]).toBeUndefined()
  })
})

// ── Bomb ──────────────────────────────────────────────────────────────────────

describe('handleBomb', () => {
  it('deducts 5 from the sending player score', () => {
    const { ws1, id1, id2, ws2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    // Give player some score first
    for (let i = 0; i < 10; i++) handleClick(ws1, { gameId }, id1)
    handleBomb(ws1, { gameId }, id1)
    expect(room.scores[id1]).toBe(5)
  })

  it('does not go below 0', () => {
    const { ws1, id1, id2, ws2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    handleBomb(ws1, { gameId }, id1) // score is 0
    expect(room.scores[id1]).toBe(0)
  })

  it('ignores bomb when game is not playing', () => {
    const { ws1, id1, gameId, room } = setupGame()
    handleBomb(ws1, { gameId }, id1)
    expect(room.scores[id1]).toBe(0)
  })
})

// ── Spectate ──────────────────────────────────────────────────────────────────

describe('handleSpectate', () => {
  it('adds ws to room spectators', () => {
    const { gameId, room } = setupGame()
    const wsSpec = makeMockWs()
    handleSpectate(wsSpec, { gameId })
    expect(room.spectators.has(wsSpec)).toBe(true)
  })

  it('sends current game_state to the new spectator', () => {
    const { gameId } = setupGame()
    const wsSpec = makeMockWs()
    handleSpectate(wsSpec, { gameId })
    const msg = lastMsg(wsSpec, 'game_state') as any
    expect(msg.gameId).toBe(gameId)
  })

  it('spectator receives game_state on every click', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    const wsSpec = makeMockWs()
    handleSpectate(wsSpec, { gameId })
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    handleClick(ws1, { gameId }, id1)

    const msgs = sentMessages(wsSpec).filter((m: any) => m.type === 'game_state')
    expect(msgs.length).toBeGreaterThan(1)
  })

  it('ignores spectate for non-existent room', () => {
    const wsSpec = makeMockWs()
    handleSpectate(wsSpec, { gameId: 'fake-room-id' })
    expect(sentMessages(wsSpec)).toHaveLength(0)
  })

  it('spectator receives game_end when game ends', () => {
    const { ws1, ws2, id1, id2, gameId } = setupGame()
    const wsSpec = makeMockWs()
    handleSpectate(wsSpec, { gameId })
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000 + 30_000)
    const msg = lastMsg(wsSpec, 'game_end') as any
    expect(msg.gameId).toBe(gameId)
  })
})

// ── Disconnect ────────────────────────────────────────────────────────────────

describe('cleanupPlayer', () => {
  it('removes player from players map', () => {
    const { ws1, id1 } = setupTwoPlayers()
    cleanupPlayer(id1, ws1)
    expect(players.has(id1)).toBe(false)
    expect(wsByPlayer.has(ws1)).toBe(false)
  })

  it('broadcasts updated lobby after disconnect', () => {
    const { ws1, ws2, id1 } = setupTwoPlayers()
    cleanupPlayer(id1, ws1)
    const lobby = lastMsg(ws2, 'lobby') as any
    expect(lobby.users.find((u: any) => u.id === id1)).toBeUndefined()
  })

  it('ends game_end if player disconnects mid-game (playing)', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000) // get to playing
    cleanupPlayer(id1, ws1)

    const msg = lastMsg(ws2, 'game_end') as any
    expect(msg.gameId).toBe(gameId)
    expect(msg.winnerId).toBe(id2)
    expect(room.state).toBe('ended')
  })

  it('ends game if player disconnects during countdown', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    // Still in countdown
    cleanupPlayer(id1, ws1)
    expect(room.state).toBe('ended')
    const msg = lastMsg(ws2, 'game_end') as any
    expect(msg.winnerId).toBe(id2)
  })

  it('[BUG FIX] deletes OTHER player\'s playerRoom entry on disconnect', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    cleanupPlayer(id1, ws1)

    // Before fix: playerRoom.get(id2) would still point to the deleted room
    // After fix: the other player's entry is also removed
    expect(playerRoom.has(id2)).toBe(false)
  })

  it('[BUG FIX] other player can accept a new challenge after opponent disconnects mid-game', () => {
    const { ws1, ws2, id1, id2, gameId } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    cleanupPlayer(id1, ws1)

    // A third player joins and challenges id2
    const ws3 = makeMockWs()
    handleJoin(ws3, { name: 'Charlie' })
    const id3 = wsByPlayer.get(ws3)!

    // id2 should NOT be stuck in the old room anymore
    handleChallenge(ws3, { targetId: id2 }, id3)
    expect(pendingChallenges.get(id3)).toBe(id2)

    handleChallengeResponse(ws2, { challengerId: id3, accepted: true }, id2)
    expect(rooms.size).toBe(1)
    expect(playerRoom.get(id2)).toBeDefined()
  })

  it('removes disconnected ws from spectator sets', () => {
    const { gameId, room } = setupGame()
    const wsSpec = makeMockWs()
    handleJoin(wsSpec, { name: 'Spec' })
    const specId = wsByPlayer.get(wsSpec)!
    handleSpectate(wsSpec, { gameId })
    expect(room.spectators.has(wsSpec)).toBe(true)
    cleanupPlayer(specId, wsSpec)
    expect(room.spectators.has(wsSpec)).toBe(false)
  })

  it('no-op if player does not exist', () => {
    const ws = makeMockWs()
    expect(() => cleanupPlayer('nonexistent', ws)).not.toThrow()
  })
})

// ── endGame winner logic ──────────────────────────────────────────────────────

describe('endGame winner', () => {
  it('correctly identifies winner when p1 has higher score', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    room.scores[id1] = 10
    room.scores[id2] = 5
    endGame(room)
    const msg = lastMsg(ws1, 'game_end') as any
    expect(msg.winnerId).toBe(id1)
  })

  it('correctly identifies winner when p2 has higher score', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    room.scores[id1] = 3
    room.scores[id2] = 9
    endGame(room)
    const msg = lastMsg(ws1, 'game_end') as any
    expect(msg.winnerId).toBe(id2)
  })

  it('sends null winner on tie', () => {
    const { ws1, ws2, id1, id2, gameId, room } = setupGame()
    handleReady(ws1, { gameId }, id1)
    handleReady(ws2, { gameId }, id2)
    vi.advanceTimersByTime(3000)
    endGame(room)
    const msg = lastMsg(ws1, 'game_end') as any
    expect(msg.winnerId).toBeNull()
  })
})
