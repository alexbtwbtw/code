export default function App() {
  return (
    <div className="page">
      <header className="header">
        <div className="brand">Portal</div>
        <p className="tagline">Select an application to continue</p>
      </header>

      <main className="grid">
        <a href="/coba/" className="card">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="card-body">
            <h2 className="card-title">COBA</h2>
            <p className="card-desc">Project management for civil engineering and geotechnical works. Track projects, teams, requirements, and tasks.</p>
          </div>
          <span className="card-arrow">→</span>
        </a>

        <a href="/game/" className="card">
          <div className="card-icon card-icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M12 12h.01" />
              <path d="M8 10v4" />
              <path d="M6 12h4" />
              <path d="M16 10v.01" />
              <path d="M18 12v.01" />
            </svg>
          </div>
          <div className="card-body">
            <h2 className="card-title">Game</h2>
            <p className="card-desc">Click as fast as you can and climb the leaderboard. How high can you score?</p>
          </div>
          <span className="card-arrow">→</span>
        </a>

        <a href="/dinaxis/" className="card">
          <div className="card-icon card-icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="card-body">
            <h2 className="card-title">Dinaxis</h2>
            <p className="card-desc">Claims adjuster portal. Manage sinistros, insurers, inspections, documents, and billing.</p>
          </div>
          <span className="card-arrow">→</span>
        </a>
      </main>
    </div>
  )
}
