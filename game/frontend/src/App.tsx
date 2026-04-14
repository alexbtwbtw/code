import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trpc, trpcClient } from './trpc'

export default function App() {
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
      <h1>Game</h1>

      <section className="game">
        <p className="score-display">Score: {score}</p>
        <button className="click-btn" onClick={() => { setScore(s => s + 1); setSubmitted(false) }}>
          Click!
        </button>
      </section>

      <section className="submit">
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

      <section className="leaderboard">
        <h2>Leaderboard</h2>
        {isLoading && <p>Loading...</p>}
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
