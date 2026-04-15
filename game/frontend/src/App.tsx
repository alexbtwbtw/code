import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc, trpcClient } from './trpc'

// ── Types (mirror backend ws.ts) ─────────────────────────────────────────────

type LobbyUser = { id: string; name: string }

type GameState = 'waiting' | 'countdown' | 'playing' | 'ended'

type GameSettings = {
  duration: 15 | 30 | 45 | 60
  movingButton: boolean
  moveSpeed: number  // pixels per second, range 50–500, default 150
  buttonSize: 'tiny' | 'small' | 'normal' | 'large'
  ghostMode: boolean
  shrinkMode: boolean
  gravityMode: boolean
  hotZone: boolean
  bombMode: boolean
}

function defaultSettings(): GameSettings {
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

type ServerMsg =
  | { type: 'assigned_id'; id: string }
  | { type: 'lobby'; users: LobbyUser[] }
  | { type: 'challenge_received'; challengerId: string; challengerName: string; settings?: GameSettings }
  | { type: 'challenge_declined'; targetId: string }
  | { type: 'game_start'; gameId: string; opponentId: string; opponentName: string; settings?: GameSettings }
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

function settingsSummary(s: GameSettings): string {
  const parts: string[] = [`${s.duration}s`]
  if (s.movingButton) parts.push('Moving')
  if (s.ghostMode) parts.push('Ghost')
  if (s.shrinkMode) parts.push('Shrink')
  if (s.gravityMode) parts.push('Gravity')
  if (s.hotZone) parts.push('Hot Zone')
  if (s.bombMode) parts.push('Bombs')
  if (s.buttonSize !== 'normal') parts.push(s.buttonSize.charAt(0).toUpperCase() + s.buttonSize.slice(1) + ' btn')
  return parts.join(' · ')
}

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
  const pendingJoinRef = useRef<string | null>(null)
  // Tracks whether the local user is an active player (received game_start) vs a spectator.
  // Using a ref avoids re-triggering the spectate effect when it changes.
  const isPlayerRef = useRef<boolean>(false)
  const [myId, setMyId] = useState<string | null>(null)
  const [myName, setMyName] = useState<string>('')
  const [joined, setJoined] = useState(false)
  const [lobbyUsers, setLobbyUsers] = useState<LobbyUser[]>([])
  const [incomingChallenge, setIncomingChallenge] = useState<{ challengerId: string; challengerName: string; settings?: GameSettings } | null>(null)
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
    settings: GameSettings
  } | null>(null)

  // Settings used when the local player sends a challenge
  const [pendingSettings, setPendingSettings] = useState<GameSettings>(defaultSettings)

  const sendWs = useCallback((msg: unknown) => {
    const ws = wsRef.current
    if (!ws) return
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    } else if (
      ws.readyState === WebSocket.CONNECTING &&
      typeof (msg as Record<string, unknown>).type === 'string' &&
      (msg as Record<string, unknown>).type === 'join'
    ) {
      // Socket still connecting — buffer the join so onopen can flush it.
      pendingJoinRef.current = (msg as Record<string, unknown>).name as string
    }
  }, [])

  // Connect WS once
  useEffect(() => {
    const ws = new WebSocket(getWsUrl())
    wsRef.current = ws

    ws.onopen = () => {
      // Flush any join that was queued while the socket was still connecting.
      const pending = pendingJoinRef.current
      if (pending) {
        pendingJoinRef.current = null
        ws.send(JSON.stringify({ type: 'join', name: pending }))
      }
    }

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
          setIncomingChallenge({ challengerId: msg.challengerId, challengerName: msg.challengerName, settings: msg.settings })
          break

        case 'challenge_declined':
          setDeclinedNotice('Your challenge was declined.')
          setTimeout(() => setDeclinedNotice(null), 3000)
          break

        case 'game_start':
          isPlayerRef.current = true
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
            settings: msg.settings ?? defaultSettings(),
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
              settings: defaultSettings(),
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
            // Preserve settings from game_start; server may also send them
            settings: (msg as typeof msg & { settings?: GameSettings }).settings ?? (prev?.settings ?? defaultSettings()),
          }))
          break

        case 'game_end':
          isPlayerRef.current = false
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

  // When navigating to a game URL directly (spectator), send spectate.
  // Players who received game_start have isPlayerRef.current === true and must NOT send spectate.
  useEffect(() => {
    if (view.kind === 'game' && myId && !isPlayerRef.current) {
      sendWs({ type: 'spectate', gameId: view.gameId })
    }
  }, [view, myId, sendWs])

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
        isParticipant={isPlayerRef.current}
        onLeave={() => {
          isPlayerRef.current = false
          navigate('/game/')
        }}
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
      pendingSettings={pendingSettings}
      setPendingSettings={setPendingSettings}
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
  pendingSettings,
  setPendingSettings,
}: {
  myId: string | null
  myName: string
  setMyName: (n: string) => void
  joined: boolean
  setJoined: (v: boolean) => void
  lobbyUsers: LobbyUser[]
  incomingChallenge: { challengerId: string; challengerName: string; settings?: GameSettings } | null
  setIncomingChallenge: (v: null) => void
  declinedNotice: string | null
  sendWs: (msg: unknown) => void
  onGoLeaderboard: () => void
  pendingSettings: GameSettings
  setPendingSettings: (s: GameSettings) => void
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
    sendWs({ type: 'challenge', targetId, settings: pendingSettings })
  }

  const handleChallengeResponse = (accepted: boolean) => {
    if (!incomingChallenge) return
    sendWs({ type: 'challenge_response', challengerId: incomingChallenge.challengerId, accepted })
    setIncomingChallenge(null)
  }

  const otherUsers = lobbyUsers.filter(u => u.id !== myId)

  // Helper to patch a single settings field
  const patchSettings = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    setPendingSettings({ ...pendingSettings, [key]: value })
  }

  return (
    <div className="container">
      <div>
        <h1 className="lobby-title">Clicker Battle</h1>
        <p className="lobby-subtitle">Real-time 1v1 clicking frenzy</p>
      </div>

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
              <div className="challenge-info">
                <span><strong>{incomingChallenge.challengerName}</strong> challenged you!</span>
                {incomingChallenge.settings && (
                  <span className="challenge-settings-summary">{settingsSummary(incomingChallenge.settings)}</span>
                )}
              </div>
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

          {/* ── Game Settings ── */}
          <section className="card">
            <h2>Game Settings</h2>

            <div className="settings-row">
              <span className="settings-label">Duration</span>
              <div className="seg-control">
                {([15, 30, 45, 60] as const).map(d => (
                  <button
                    key={d}
                    className={`seg-btn${pendingSettings.duration === d ? ' seg-btn-active' : ''}`}
                    onClick={() => patchSettings('duration', d)}
                  >{d}s</button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <span className="settings-label">Button size</span>
              <div className="seg-control">
                {(['tiny', 'small', 'normal', 'large'] as const).map(s => (
                  <button
                    key={s}
                    className={`seg-btn${pendingSettings.buttonSize === s ? ' seg-btn-active' : ''}`}
                    onClick={() => patchSettings('buttonSize', s)}
                  >{s}</button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <label className="settings-toggle">
                <span className="settings-label">Moving button</span>
                <input
                  type="checkbox"
                  checked={pendingSettings.movingButton}
                  disabled={pendingSettings.gravityMode}
                  onChange={e => patchSettings('movingButton', e.target.checked)}
                />
              </label>
            </div>

            {pendingSettings.movingButton && (
              <div className="settings-row settings-indent">
                <span className="settings-label">Speed <span className="settings-value">{pendingSettings.moveSpeed} px/s</span></span>
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={10}
                  value={pendingSettings.moveSpeed}
                  onChange={e => patchSettings('moveSpeed', Number(e.target.value))}
                  className="settings-slider"
                />
              </div>
            )}

            <div className="settings-row">
              <label className="settings-toggle">
                <span className="settings-label">Gravity mode</span>
                <input
                  type="checkbox"
                  checked={pendingSettings.gravityMode}
                  disabled={pendingSettings.movingButton}
                  onChange={e => patchSettings('gravityMode', e.target.checked)}
                />
              </label>
            </div>

            <div className="settings-row">
              <label className="settings-toggle">
                <span className="settings-label">Ghost mode</span>
                <input
                  type="checkbox"
                  checked={pendingSettings.ghostMode}
                  onChange={e => patchSettings('ghostMode', e.target.checked)}
                />
              </label>
            </div>

            <div className="settings-row">
              <label className="settings-toggle">
                <span className="settings-label">Shrink mode</span>
                <input
                  type="checkbox"
                  checked={pendingSettings.shrinkMode}
                  onChange={e => patchSettings('shrinkMode', e.target.checked)}
                />
              </label>
            </div>

            <div className="settings-row">
              <label className="settings-toggle">
                <span className="settings-label">Hot zone</span>
                <input
                  type="checkbox"
                  checked={pendingSettings.hotZone}
                  onChange={e => patchSettings('hotZone', e.target.checked)}
                />
              </label>
            </div>

            <div className="settings-row">
              <label className="settings-toggle">
                <span className="settings-label">Bomb mode</span>
                <input
                  type="checkbox"
                  checked={pendingSettings.bombMode}
                  onChange={e => patchSettings('bombMode', e.target.checked)}
                />
              </label>
            </div>
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
  isParticipant,
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
    settings: GameSettings
    winnerId?: string | null
  } | null
  sendWs: (msg: unknown) => void
  isParticipant: boolean
  onLeave: () => void
}) {
  const room = gameRoom?.gameId === gameId ? gameRoom : null
  const settings: GameSettings = room?.settings ?? defaultSettings()

  // isParticipant is set when this client received game_start (authoritative).
  // Fall back to room-based check once game_state arrives with player IDs.
  const isPlayer = isParticipant || (myId !== null && room !== null && (room.player1Id === myId || room.player2Id === myId))

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

  // ── Timer countdown ──────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<number>(settings.duration)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (room?.state === 'playing') {
      setTimeLeft(settings.duration)
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current!); return 0 }
          return t - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [room?.state]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Moving Button (rAF bounce) ───────────────────────────────────────────
  const posRef = useRef({ x: 20, y: 20 })        // % of container
  const velRef = useRef({ vx: 1, vy: 0.7 })       // direction unit vector, scaled by speed
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 })

  useEffect(() => {
    if (room?.state !== 'playing' || !settings.movingButton || settings.gravityMode) return

    // Scale velocity so moveSpeed (px/s) translates to % of container per second
    // Assume container is ~400px wide/tall for normalization
    const speedPct = settings.moveSpeed / 400  // % per ms when multiplied by dt

    // Randomise initial direction
    const angle = Math.random() * Math.PI * 2
    velRef.current = { vx: Math.cos(angle), vy: Math.sin(angle) }
    lastTimeRef.current = 0

    function tick(now: number) {
      const dt = lastTimeRef.current ? now - lastTimeRef.current : 16
      lastTimeRef.current = now

      const pos = posRef.current
      const vel = velRef.current
      const step = speedPct * dt * 100  // convert to % movement

      let newX = pos.x + vel.vx * step
      let newY = pos.y + vel.vy * step

      // Bounce off edges (keep button within 5%–85% so it stays visible)
      if (newX < 5 || newX > 85) { velRef.current = { ...velRef.current, vx: -vel.vx }; newX = Math.max(5, Math.min(85, newX)) }
      if (newY < 5 || newY > 85) { velRef.current = { ...velRef.current, vy: -vel.vy }; newY = Math.max(5, Math.min(85, newY)) }

      posRef.current = { x: newX, y: newY }
      setButtonPos({ x: newX, y: newY })
      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [room?.state, settings.movingButton, settings.moveSpeed, settings.gravityMode])

  // ── Gravity Mode ─────────────────────────────────────────────────────────
  const gravityRef = useRef<{ x: number; y: number; vx: number; vy: number }>({
    x: 50, y: 30, vx: 1.5, vy: 0,
  })
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (room?.state !== 'playing' || !settings.gravityMode) return
    gravityRef.current = { x: 50, y: 30, vx: 1.5, vy: 0 }
    const step = () => {
      const g = gravityRef.current
      g.vy += 0.3
      g.x += g.vx
      g.y += g.vy
      if (g.x < 5)  { g.x = 5;  g.vx =  Math.abs(g.vx) }
      if (g.x > 90) { g.x = 90; g.vx = -Math.abs(g.vx) }
      if (g.y < 5)  { g.y = 5;  g.vy =  Math.abs(g.vy) }
      if (g.y > 85) { g.y = 85; g.vy = -Math.abs(g.vy) * 0.8 }
      setButtonPos({ x: g.x, y: g.y })
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [room?.state, settings.gravityMode])

  // ── Ghost Mode ───────────────────────────────────────────────────────────
  const [isGhost, setIsGhost] = useState(false)

  useEffect(() => {
    if (room?.state !== 'playing' || !settings.ghostMode) { setIsGhost(false); return }
    const id = setInterval(() => {
      setIsGhost(true)
      setTimeout(() => setIsGhost(false), 500)
    }, 3000)
    return () => clearInterval(id)
  }, [room?.state, settings.ghostMode])

  // ── Hot Zone ─────────────────────────────────────────────────────────────
  const [hotZonePos, setHotZonePos] = useState<{ x: number; y: number }>({ x: 30, y: 40 })

  useEffect(() => {
    if (room?.state !== 'playing' || !settings.hotZone) return
    setHotZonePos({ x: 10 + Math.random() * 60, y: 10 + Math.random() * 60 })
    const id = setInterval(() => {
      setHotZonePos({ x: 10 + Math.random() * 60, y: 10 + Math.random() * 60 })
    }, 10_000)
    return () => clearInterval(id)
  }, [room?.state, settings.hotZone])

  // ── Bomb Mode ────────────────────────────────────────────────────────────
  const [bombPos, setBombPos] = useState<{ x: number; y: number } | null>(null)
  const bombTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (room?.state !== 'playing' || !settings.bombMode) { setBombPos(null); return }
    const spawnBomb = () => {
      setBombPos({ x: 5 + Math.random() * 80, y: 5 + Math.random() * 80 })
      bombTimerRef.current = setTimeout(() => {
        setBombPos(null)
        bombTimerRef.current = setTimeout(spawnBomb, 8_000)
      }, 3_000)
    }
    bombTimerRef.current = setTimeout(spawnBomb, 8_000)
    return () => {
      if (bombTimerRef.current) clearTimeout(bombTimerRef.current)
      setBombPos(null)
    }
  }, [room?.state, settings.bombMode])

  // ── Click handlers ───────────────────────────────────────────────────────
  const handleReady = () => sendWs({ type: 'ready', gameId })

  const inHotZone = (bx: number, by: number, zx: number, zy: number) => {
    const dx = bx - zx, dy = by - zy
    return Math.sqrt(dx * dx + dy * dy) < 12
  }

  const handleClick = () => {
    if (room?.state !== 'playing') return
    if (settings.hotZone && inHotZone(buttonPos.x, buttonPos.y, hotZonePos.x, hotZonePos.y)) {
      sendWs({ type: 'click', gameId })
      sendWs({ type: 'click', gameId })
    } else {
      sendWs({ type: 'click', gameId })
    }
  }

  const handleBombClick = () => {
    if (room?.state !== 'playing') return
    sendWs({ type: 'bomb', gameId })
    setBombPos(null)
  }

  // ── Shrink scale ─────────────────────────────────────────────────────────
  const shrinkScale = settings.shrinkMode && room?.state === 'playing'
    ? 0.3 + (timeLeft / settings.duration) * 1.2
    : 1

  const isMoving = settings.movingButton || settings.gravityMode

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
        <div className="spectator-header">
          <button className="btn-ghost" onClick={onLeave}>← Lobby</button>
          <span className="spectator-badge">Spectating</span>
        </div>

        <div className="score-board spectator-board">
          <ScoreCard name={room.player1Name} score={room.scores[room.player1Id] ?? 0} highlight={false} />
          <div className="vs-divider">
            {room.state === 'countdown' && <span className="countdown">{room.countdown}</span>}
            {room.state === 'playing' && <span className={`timer${timeLeft < 10 ? ' timer-low' : ''}`}>{timeLeft}s</span>}
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
          {room.state === 'playing' && <span className={`timer${timeLeft < 10 ? ' timer-low' : ''}`}>{timeLeft}s</span>}
          {room.state === 'ended' && <span className="ended-label">ENDED</span>}
          {room.state === 'waiting' && <span className="vs-text">VS</span>}
        </div>
        <ScoreCard name={opponentName} score={opponentScore} highlight={false} />
      </div>

      {room.state === 'waiting' && (
        <div className="ready-section">
          <div className="game-mode-badges">
            {settingsSummary(settings).split(' · ').map(badge => (
              <span key={badge} className="mode-badge">{badge}</span>
            ))}
          </div>
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
        <div className={`playing-section${isMoving ? ' playing-arena' : ''}`}>
          {/* Hot Zone */}
          {settings.hotZone && (
            <div
              className="hot-zone"
              style={{ left: `${hotZonePos.x}%`, top: `${hotZonePos.y}%` }}
            >
              <span className="hot-zone-label">2×</span>
            </div>
          )}

          {/* Bomb */}
          {bombPos && (
            <button
              className="bomb-btn"
              style={{ left: `${bombPos.x}%`, top: `${bombPos.y}%` }}
              onClick={handleBombClick}
            >
              💣
            </button>
          )}

          {/* Main click button */}
          <button
            className={`click-btn big-click btn-size-${settings.buttonSize}${isGhost ? ' ghost' : ''}`}
            style={
              isMoving
                ? {
                    position: 'absolute',
                    left: `${buttonPos.x}%`,
                    top: `${buttonPos.y}%`,
                    transform: `translate(-50%, -50%) scale(${shrinkScale})`,
                    transition: (settings.gravityMode || settings.movingButton) ? 'none' : 'left 0.3s ease, top 0.3s ease',
                  }
                : settings.shrinkMode
                ? { transform: `scale(${shrinkScale})` }
                : undefined
            }
            onClick={handleClick}
          >
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
