# game/CLAUDE.md

## Project Overview

Clicker Battle is a real-time multiplayer game where two players race to click a button as many times as possible within a 30-second window. Players join a shared lobby via WebSocket, challenge each other, and play head-to-head. Spectators can watch any live or recently-ended game. A leaderboard (backed by SQLite via tRPC) records solo high scores.

## Commands

All commands are run from the `game/` directory.

```bash
# Install dependencies
npm install

# Development (backend on :3001 + frontend on :5174 concurrently)
npm run dev

# Individual servers
npm run dev:backend      # tsx watch on game/backend/src/server.ts
npm run dev:frontend     # Vite dev server

# Build
npm run build            # tsc (backend) + tsc+vite (frontend)
```

Requires Node >= v25 (see `.nvmrc`).

## Architecture

Monorepo with two packages (`backend/`, `frontend/`) and a root `game/package.json`.

### Ports

| Service           | Port |
|-------------------|------|
| Game backend HTTP | 3001 |
| Game backend WS   | 3001 (same port, upgraded) |
| Game frontend     | 5174 (dev) / served from S3 in prod |

### Backend (`game/backend/src/`)

- **Hono** HTTP server (entry: `server.ts` → `index.ts`)
- **tRPC** router mounted at `/trpc/*` — currently exposes `scores.list` and `scores.add`
- **WebSocket server** attached to the same HTTP server (no extra port) — handles the entire multiplayer game loop
- **better-sqlite3** in-memory database — `scores` table
- Entry: `server.ts` starts the Hono HTTP server and calls `setupWebSocketServer`

### Frontend (`game/frontend/src/`)

- **React 19** + **Vite** + **TanStack React Query** + **tRPC client**
- Single-file `App.tsx` with three views: `LobbyView`, `GameView`, `LeaderboardView`
- Routing is managed via the History API (`pushState` / `popstate`)
- WebSocket URL is derived at runtime: `wss://host/game/ws` (prod) or `ws://host/game/ws` (dev)

## WebSocket Message Protocol

### Client → Server

| type | fields | description |
|------|--------|-------------|
| `join` | `name: string` | Register in the lobby (name is sanitised server-side: printable ASCII, max 30 chars) |
| `challenge` | `targetId: string` | Send a challenge to another lobby player |
| `challenge_response` | `challengerId: string`, `accepted: boolean` | Accept or decline an incoming challenge |
| `ready` | `gameId: string` | Signal readiness to start the game |
| `click` | `gameId: string` | Register a click during the playing phase (rate-limited to 20/s) |
| `spectate` | `gameId: string` | Join a game as a spectator |

### Server → Client

| type | fields | description |
|------|--------|-------------|
| `assigned_id` | `id: string` | Sent after a successful `join`; the player's unique ID |
| `lobby` | `users: {id, name}[]` | Full lobby snapshot; broadcast on any join/disconnect |
| `challenge_received` | `challengerId`, `challengerName` | Incoming challenge notification |
| `challenge_declined` | `targetId` | The target declined the challenge |
| `game_start` | `gameId`, `opponentId`, `opponentName` | Both players receive this when a room is created |
| `game_state` | `gameId`, `state`, `scores`, `ready`, `countdown?`, `player1Id/Name`, `player2Id/Name` | Full room snapshot; sent on ready/click/countdown ticks |
| `game_end` | `gameId`, `scores`, `winnerId` | Sent when time expires or a player disconnects |

## Game State Machine

```
  join lobby
      │
      ▼
  [waiting]  ◄── both players must send `ready`
      │
      │  both ready
      ▼
  [countdown]  3 → 2 → 1 (1-second ticks)
      │
      │  countdown reaches 0
      ▼
  [playing]  players click for 30 seconds
      │
      │  timer expires OR a player disconnects
      ▼
  [ended]  game_end broadcast; room deleted after 30s
```

## ws/ Directory Structure

```
game/backend/src/ws/
├── types.ts      — TypeScript types: Player, GameRoom, Msg discriminated union
├── state.ts      — Shared in-memory Maps: players, wsByPlayer, rooms, playerRoom, pendingChallenges
├── lobby.ts      — send(), broadcastLobby(), handleJoin(), handleChallenge(), handleChallengeResponse()
├── game.ts       — broadcastRoom(), getRoomGameState(), startCountdown(), endGame(), handleReady(), handleClick(), handleSpectate(); click rate limiter
├── cleanup.ts    — cleanupPlayer(): handles disconnect, aborts in-progress games, removes spectator entries
└── index.ts      — setupWebSocketServer(): wires everything together; exported to server.ts
```

## Security Notes

- **Input validation**: all incoming WS messages are checked with `isObject()` and field-level type guards before dispatch; invalid messages are silently dropped.
- **Name sanitisation**: names are stripped of non-printable/non-ASCII characters, trimmed, and capped at 30 characters.
- **Click rate limiting**: max 20 clicks per second per player; excess clicks are silently discarded.
- **Challenge validation**: a `pendingChallenges` map ensures `challenge_response` messages are only accepted if a matching pending challenge exists, and rejects responses when either party is already in a room.
- **Room cleanup**: rooms are deleted 30 seconds after `game_end` (spectators can still see the result).
- **Spectator cleanup**: on disconnect, the leaving WebSocket is removed from all room spectator sets.
- **Safe JSON.stringify**: `send()` wraps `ws.send()` in a try/catch and checks `readyState === OPEN`.
