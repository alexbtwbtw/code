import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc, trpcClient } from './trpc'

// ── Types (mirror backend ws.ts) ─────────────────────────────────────────────

type LobbyUser = { id: string; name: string }

type GameState = 'waiting' | 'countdown' | 'playing' | 'ended'

type ServerMsg =
  | { type: 'assigned_id'; id: string }
  | { type: 'lobby'; users: LobbyUser[] }
  | { type: 'challenge_received'; challengerId: string; challengerName: string }
  | { type: 'challenge_declined'; targetId: string }
  | { type: 'game_start'; gameId: string; opponentId: string; opponentName: string }
  | {
      type: 'game_state'
      gameId: string
      state: GameState
      scores: Record<string, number>
      ready: string[]
      countdown?: number
      player1Id: string
      player1Name: string
      player2Id: string
      player2Name: string
    }
  | { type: 'game_end'; gameId: string; scores: Record<string, number>; winnerId: string | null }

// ── Routing ───────────────────────────────────────────────────────────────────

type View =
  | { kind: 'lobby' }
  | { kind: 'game'; gameId: string }
  | { kind: 'leaderboard' }

function getView(): View {
  const path = window.location.pathname
  // Matches /game/<uuid>
  const gameMatch = path.match(/^\/game\/([0-9a-f-]{36})\/?$/)
  if (gameMatch) return { kind: 'game', gameId: gameMatch[1] }
  if (path === '/game/leaderboard' || path === '/game/leaderboard/') return { kind: 'leaderboard' }
  return { kind: 'lobby' }
}

function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// ── WS connection URL ─────────────────────────────────────────────────────────

function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/game/ws`
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>(getView)

  useEffect(() => {
    const handler = () => setView(getView())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  // Shared WebSocket state lifted to App so WS persists across view changes
  const wsRef = useRef<WebSocket | null>(null)
  const [myId, setMyId] = useState<string | null>(null)
  const [myName, setMyName] = useState<string>('')
  const [joined, setJoined] = useState(false)
  const [lobbyUsers, setLobbyUsers] = useState<LobbyUser[]>([])
  const [incomingChallenge, setIncomingChallenge] = useState<{ challengerId: string; challengerName: string } | null>(null)
  const [declinedNotice, setDeclinedNotice] = useState<string | null>(null)

  // Game state
  const [gameRoom, setGameRoom] = useState<{
    gameId: string
    opponentId: string
    opponentName: string
    state: GameState
    scores: Record<string, number>
    ready: string[]
    countdown?: number
    player1Id: string
    player1Name: string
    player2Id: string
    player2Name: string
    winnerId?: string | null
  } | null>(null)

  const sendWs = useCallback((msg: unknown) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }, [])

  // Connect WS once
  useEffect(() => {
    const ws = new WebSocket(getWsUrl())
    wsRef.current = ws

    ws.onmessage = (evt) => {
      let msg: ServerMsg
      try { msg = JSON.parse(evt.data) } catch { return }

      switch (msg.type) {
        case 'assigned_id':
          setMyId(msg.id)
          break

        case 'lobby':
          setLobbyUsers(msg.users)
          break

        case 'challenge_received':
          setIncomingChallenge({ challengerId: msg.challengerId, challengerName: msg.challengerName })
          break

        case 'challenge_declined':
          setDeclinedNotice('Your challenge was declined.')
          setTimeout(() => setDeclinedNotice(null), 3000)
          break

        case 'game_start':
          setGameRoom({
            gameId: msg.gameId,
            opponentId: msg.opponentId,
            opponentName: msg.opponentName,
            state: 'waiting',
            scores: {},
            ready: [],
            player1Id: '',
            player1Name: '',
            player2Id: '',
            player2Name: '',
          })
          setIncomingChallenge(null)
          navigate(`/game/${msg.gameId}`)
          break

        case 'game_state':
          setGameRoom(prev => ({
            ...(prev ?? {
              gameId: msg.gameId,
              opponentId: '',
              opponentName: '',
            }),
            gameId: msg.gameId,
            state: msg.state,
            scores: msg.scores,
            ready: msg.ready,
            countdown: msg.countdown,
            player1Id: msg.player1Id,
            player1Name: msg.player1Name,
            player2Id: msg.player2Id,
            player2Name: msg.player2Name,
          }))
          break

        case 'game_end':
          setGameRoom(prev => prev ? { ...prev, state: 'ended', scores: msg.scores, winnerId: msg.winnerId } : null)
          break
      }
    }

    ws.onclose = () => {
      setJoined(false)
      setMyId(null)
    }

    return () => ws.close()
  }, [])

  // When navigating to a game URL directly (spectator), send spectate
  useEffect(() => {
    if (view.kind === 'game' && myId) {
      const isPlayer = gameRoom?.gameId === view.gameId
      if (!isPlayer) {
        sendWs({ type: 'spectate', gameId: view.gameId })
      }
    }
  }, [view, myId, gameRoom, sendWs])

  // ── Views ──────────────────────────────────────────────────────────────────

  if (view.kind === 'leaderboard') {
    return <LeaderboardView onBack={() => navigate('/game/')} />
  }

  if (view.kind === 'game') {
    return (
      <GameView
        gameId={view.gameId}
        myId={myId}
        gameRoom={gameRoom}
        sendWs={sendWs}
        onLeave={() => navigate('/game/')}
      />
    )
  }

  // Lobby view
  return (
    <LobbyView
      myId={myId}
      myName={myName}
      setMyName={setMyName}
      joined={joined}
      setJoined={setJoined}
      lobbyUsers={lobbyUsers}
      incomingChallenge={incomingChallenge}
      setIncomingChallenge={setIncomingChallenge}
      declinedNotice={declinedNotice}
      sendWs={sendWs}
      onGoLeaderboard={() => navigate('/game/leaderboard')}
    />
  )
}

// ── Lobby View ────────────────────────────────────────────────────────────────

function LobbyView({
  myId,
  myName,
  setMyName,
  joined,
  setJoined,
  lobbyUsers,
  incomingChallenge,
  setIncomingChallenge,
  declinedNotice,
  sendWs,
  onGoLeaderboard,
}: {
  myId: string | null
  myName: string
  setMyName: (n: string) => void
  joined: boolean
  setJoined: (v: boolean) => void
  lobbyUsers: LobbyUser[]
  incomingChallenge: { challengerId: string; challengerName: string } | null
  setIncomingChallenge: (v: null) => void
  declinedNotice: string | null
  sendWs: (msg: unknown) => void
  onGoLeaderboard: () => void
}) {
  const [nameInput, setNameInput] = useState(myName)

  const handleJoin = () => {
    const name = nameInput.trim()
    if (!name) return
    setMyName(name)
    sendWs({ type: 'join', name })
    setJoined(true)
  }

  const handleChallenge = (targetId: string) => {
    sendWs({ type: 'challenge', targetId })
  }

  const handleChallengeResponse = (accepted: boolean) => {
    if (!incomingChallenge) return
    sendWs({ type: 'challenge_response', challengerId: incomingChallenge.challengerId, accepted })
    setIncomingChallenge(null)
  }

  const otherUsers = lobbyUsers.filter(u => u.id !== myId)

  return (
    <div className="container">
      <h1>Clicker Battle</h1>

      {!joined ? (
        <section className="card">
          <h2>Join Lobby</h2>
          <div className="row gap">
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="Enter your name"
              maxLength={50}
              className="flex-input"
            />
            <button onClick={handleJoin} disabled={!nameInput.trim()} className="btn-primary">
              Join
            </button>
          </div>
        </section>
      ) : (
        <>
          {incomingChallenge && (
            <div className="banner challenge-banner">
              <span><strong>{incomingChallenge.challengerName}</strong> challenged you!</span>
              <div className="row gap">
                <button className="btn-primary" onClick={() => handleChallengeResponse(true)}>Accept</button>
                <button className="btn-secondary" onClick={() => handleChallengeResponse(false)}>Decline</button>
              </div>
            </div>
          )}

          {declinedNotice && (
            <div className="banner declined-banner">{declinedNotice}</div>
          )}

          <section className="card">
            <div className="lobby-header">
              <h2>Lobby <span className="pill">{otherUsers.length + 1} online</span></h2>
              <button className="btn-ghost" onClick={onGoLeaderboard}>Leaderboard →</button>
            </div>

            {otherUsers.length === 0 ? (
              <p className="muted">Waiting for other players to join…</p>
            ) : (
              <ul className="player-list">
                {otherUsers.map(u => (
                  <li key={u.id} className="player-row">
                    <span className="player-name">{u.name}</span>
                    <button className="btn-challenge" onClick={() => handleChallenge(u.id)}>
                      Challenge
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card you-card">
            <span className="muted-label">You're playing as</span>
            <span className="your-name">{myName}</span>
          </section>
        </>
      )}
    </div>
  )
}

// ── Game View ─────────────────────────────────────────────────────────────────

function GameView({
  gameId,
  myId,
  gameRoom,
  sendWs,
  onLeave,
}: {
  gameId: string
  myId: string | null
  gameRoom: {
    gameId: string
    opponentId: string
    opponentName: string
    state: GameState
    scores: Record<string, number>
    ready: string[]
    countdown?: number
    player1Id: string
    player1Name: string
    player2Id: string
    player2Name: string
    winnerId?: string | null
  } | null
  sendWs: (msg: unknown) => void
  onLeave: () => void
}) {
  const [timeLeft, setTimeLeft] = useState(30)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const room = gameRoom?.gameId === gameId ? gameRoom : null
  const isPlayer = myId !== null && room !== null && (room.player1Id === myId || room.player2Id === myId)

  // Derive opponent info for players
  let myScore = 0
  let opponentId = ''
  let opponentName = ''
  let opponentScore = 0

  if (room && myId && isPlayer) {
    myScore = room.scores[myId] ?? 0
    opponentId = room.player1Id === myId ? room.player2Id : room.player1Id
    opponentName = room.player1Id === myId ? room.player2Name : room.player1Name
    opponentScore = room.scores[opponentId] ?? 0
  }

  // Timer countdown during 'playing'
  useEffect(() => {
    if (room?.state === 'playing') {
      setTimeLeft(30)
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!)
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [room?.state])

  const handleReady = () => sendWs({ type: 'ready', gameId })
  const handleClick = () => {
    if (room?.state === 'playing') sendWs({ type: 'click', gameId })
  }

  if (!room) {
    return (
      <div className="container center-content">
        <p className="muted">Loading game room…</p>
        <button className="btn-ghost mt" onClick={onLeave}>← Back to Lobby</button>
      </div>
    )
  }

  const amReady = myId ? room.ready.includes(myId) : false
  const winnerId = (room as typeof room & { winnerId?: string | null }).winnerId

  // ── Spectator view ───────────────────────────────────────────────────────
  if (!isPlayer) {
    return (
      <div className="container">
        <div className="game-header">
          <button className="btn-ghost" onClick={onLeave}>← Lobby</button>
          <h1>Spectating</h1>
        </div>

        <div className="score-board spectator-board">
          <ScoreCard name={room.player1Name} score={room.scores[room.player1Id] ?? 0} highlight={false} />
          <div className="vs-divider">
            {room.state === 'countdown' && <span className="countdown">{room.countdown}</span>}
            {room.state === 'playing' && <span className="timer">{timeLeft}s</span>}
            {room.state === 'ended' && <span className="ended-label">ENDED</span>}
            {room.state === 'waiting' && <span className="vs-text">VS</span>}
          </div>
          <ScoreCard name={room.player2Name} score={room.scores[room.player2Id] ?? 0} highlight={false} />
        </div>

        {room.state === 'ended' && winnerId !== undefined && (
          <div className="result-card">
            {winnerId === null
              ? <p className="result-tie">It's a tie!</p>
              : <p className="result-win">
                  Winner: <strong>
                    {winnerId === room.player1Id ? room.player1Name : room.player2Name}
                  </strong>
                </p>
            }
          </div>
        )}
      </div>
    )
  }

  // ── Player view ───────────────────────────────────────────────────────────
  return (
    <div className="container">
      <div className="game-header">
        <button className="btn-ghost" onClick={onLeave}>← Lobby</button>
        <h1>Battle!</h1>
      </div>

      <div className="score-board">
        <ScoreCard name="You" score={myScore} highlight={true} />
        <div className="vs-divider">
          {room.state === 'countdown' && <span className="countdown">{room.countdown}</span>}
          {room.state === 'playing' && <span className="timer">{timeLeft}s</span>}
          {room.state === 'ended' && <span className="ended-label">ENDED</span>}
          {room.state === 'waiting' && <span className="vs-text">VS</span>}
        </div>
        <ScoreCard name={opponentName} score={opponentScore} highlight={false} />
      </div>

      {room.state === 'waiting' && (
        <div className="ready-section">
          <p className="muted">
            {room.ready.length === 0
              ? 'Both players must click Ready to start.'
              : room.ready.length === 1
              ? amReady ? 'Waiting for opponent…' : 'Opponent is ready! Click Ready to start.'
              : 'Starting…'}
          </p>
          <button
            className={`btn-ready ${amReady ? 'ready-active' : ''}`}
            onClick={handleReady}
            disabled={amReady}
          >
            {amReady ? 'Ready ✓' : 'Ready'}
          </button>
        </div>
      )}

      {room.state === 'countdown' && (
        <div className="countdown-display">
          <span className="countdown-big">{room.countdown}</span>
          <p className="muted">Get ready to click!</p>
        </div>
      )}

      {room.state === 'playing' && (
        <div className="playing-section">
          <button className="click-btn big-click" onClick={handleClick}>
            CLICK!
          </button>
        </div>
      )}

      {room.state === 'ended' && winnerId !== undefined && (
        <div className="result-card">
          {winnerId === null
            ? <p className="result-tie">It's a tie!</p>
            : winnerId === myId
              ? <p className="result-win">You win! 🎉</p>
              : <p className="result-lose">You lose. Better luck next time!</p>
          }
          <button className="btn-primary mt" onClick={onLeave}>Back to Lobby</button>
        </div>
      )}
    </div>
  )
}

function ScoreCard({ name, score, highlight }: { name: string; score: number; highlight: boolean }) {
  return (
    <div className={`score-card ${highlight ? 'score-card-you' : ''}`}>
      <div className="score-name">{name}</div>
      <div className="score-num">{score}</div>
    </div>
  )
}

// ── Leaderboard View ──────────────────────────────────────────────────────────

function LeaderboardView({ onBack }: { onBack: () => void }) {
  const qc = useQueryClient()
  const [player, setPlayer] = useState('')
  const [score, setScore] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const { data: scores, isLoading } = useQuery(trpc.scores.list.queryOptions())

  const addScore = useMutation({
    mutationFn: (vars: { player: string; score: number }) =>
      trpcClient.scores.add.mutate(vars),
    onSuccess: () => {
      void qc.invalidateQueries()
      setSubmitted(true)
    },
  })

  return (
    <div className="container">
      <div className="game-header">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <h1>Leaderboard</h1>
      </div>

      <section className="card game">
        <p className="score-display">Score: {score}</p>
        <button className="click-btn" onClick={() => { setScore(s => s + 1); setSubmitted(false) }}>
          Click!
        </button>
      </section>

      <section className="card submit">
        <input
          value={player}
          onChange={e => setPlayer(e.target.value)}
          placeholder="Your name"
          maxLength={50}
        />
        <button
          onClick={() => addScore.mutate({ player: player.trim(), score })}
          disabled={!player.trim() || addScore.isPending || submitted}
        >
          {submitted ? 'Submitted!' : 'Submit Score'}
        </button>
      </section>

      <section className="card leaderboard">
        <h2>Top Scores</h2>
        {isLoading && <p>Loading…</p>}
        {scores?.length === 0 && <p>No scores yet. Be the first!</p>}
        <ol>
          {scores?.map((s, i) => (
            <li key={s.id} className={i === 0 ? 'top' : ''}>
              <span className="name">{s.player}</span>
              <span className="pts">{s.score}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
