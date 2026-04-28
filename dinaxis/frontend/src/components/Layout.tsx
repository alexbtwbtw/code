import React, { useState, useEffect } from 'react'
import type { Page } from '../App'

interface Props {
  page: Page
  onNavigate: (p: Page) => void
  children: React.ReactNode
}

const navItems: Array<{ label: string; page: Page; icon: React.ReactNode }> = [
  {
    label: 'Painel',
    page: { view: 'dashboard' },
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4"/>
      </svg>
    ),
  },
  {
    label: 'Sinistros',
    page: { view: 'claims' },
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 2a1 1 0 011-1h5.586a1 1 0 01.707.293l2.414 2.414A1 1 0 0113 4.414V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2z" stroke="currentColor" strokeWidth="1.25" fill="none"/>
        <path d="M9 1v3a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.25"/>
      </svg>
    ),
  },
  {
    label: 'Peritos',
    page: { view: 'experts' },
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.25" fill="none"/>
        <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  {
    label: 'Seguradoras',
    page: { view: 'insurers' },
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="6" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.25" fill="none"/>
        <path d="M5 15V10h6v5" stroke="currentColor" strokeWidth="1.25"/>
        <path d="M1 6l7-5 7 5" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: 'Relatórios',
    page: { view: 'reports' },
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor" opacity="0.7"/>
        <rect x="11" y="2" width="3" height="13" rx="1" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
  },
]

const claimSections = [
  { id: 'visao-geral',  label: 'Visão Geral' },
  { id: 'vistorias',   label: 'Vistorias' },
  { id: 'itens-dano',  label: 'Itens de Dano' },
  { id: 'faturamento', label: 'Faturamento' },
  { id: 'documentos',  label: 'Documentos' },
  { id: 'comentarios', label: 'Comentários' },
]

function useTheme() {
  const [theme, setTheme] = React.useState<'dark' | 'light'>(
    () => (localStorage.getItem('dinaxis-theme') as 'dark' | 'light') ?? 'dark'
  )
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('dinaxis-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }
  return { theme, toggle }
}

export default function Layout({ page, onNavigate, children }: Props) {
  const { theme, toggle } = useTheme()
  const isClaimView = page.view === 'claim'

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 600)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => {
      setIsMobile(window.innerWidth < 600)
      if (window.innerWidth >= 600) setMenuOpen(false)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Close menu on navigation
  function handleNavigate(p: Page) {
    setMenuOpen(false)
    onNavigate(p)
  }

  const ThemeToggle = () => (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '0.25rem 0.5rem', borderRadius: '999px',
        color: 'var(--text-muted)', fontSize: '0.75rem',
      }}
    >
      <span style={{ whiteSpace: 'nowrap' }}>
        {theme === 'dark' ? 'Escuro' : 'Claro'}
      </span>
      <div style={{
        width: '32px', height: '18px', borderRadius: '999px',
        background: theme === 'dark' ? 'var(--accent)' : 'var(--border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: '2px',
          left: theme === 'dark' ? '16px' : '2px',
          width: '14px', height: '14px', borderRadius: '999px',
          background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </div>
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top navbar */}
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Gradient accent strip */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', flexShrink: 0 }} />

        {/* Main navbar row */}
        <div style={{ height: '53px', display: 'flex', alignItems: 'center', padding: '0 1.25rem', gap: '1.5rem' }}>
          {/* Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <div style={{ width: '8px', height: '8px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: '3px', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '0.12em' }}>
                DINAXIS
              </span>
              {!isMobile && (
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.03em', marginTop: '1px' }}>
                  Portal de Sinistros
                </span>
              )}
            </div>
          </div>

          {isMobile ? (
            /* ── Mobile: spacer + hamburger button ── */
            <>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Abrir menu"
                style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  alignItems: 'center', gap: '5px', width: '40px', height: '40px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderRadius: '8px', padding: '8px', color: 'var(--text)',
                  flexShrink: 0,
                }}
              >
                <span style={{ display: 'block', width: '20px', height: '2px', background: 'currentColor', borderRadius: '2px', transition: 'transform 0.2s, opacity 0.2s', transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
                <span style={{ display: 'block', width: '20px', height: '2px', background: 'currentColor', borderRadius: '2px', transition: 'opacity 0.2s', opacity: menuOpen ? 0 : 1 }} />
                <span style={{ display: 'block', width: '20px', height: '2px', background: 'currentColor', borderRadius: '2px', transition: 'transform 0.2s, opacity 0.2s', transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
              </button>
            </>
          ) : (
            /* ── Desktop: nav links + theme toggle ── */
            <>
              <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                {navItems.map(item => {
                  const isActive = page.view === item.page.view || (item.page.view === 'claims' && page.view === 'claim')
                  return (
                    <button
                      key={item.page.view}
                      onClick={() => handleNavigate(item.page)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.375rem 0.75rem', borderRadius: '6px', border: 'none',
                        background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                        fontSize: '0.8125rem', fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer', transition: 'background 0.15s ease, color 0.15s ease',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { if (!isActive) { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'rgba(255,255,255,0.05)'; el.style.color = 'var(--text)' } }}
                      onMouseLeave={e => { if (!isActive) { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'transparent'; el.style.color = 'var(--text-muted)' } }}
                    >
                      {item.icon}{item.label}
                    </button>
                  )
                })}
              </nav>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <ThemeToggle />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.55, letterSpacing: '0.04em' }}>v0.1.0</span>
              </div>
            </>
          )}
        </div>

        {/* ── Mobile drawer menu ── */}
        {isMobile && menuOpen && (
          <div style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: '0.5rem 0.75rem 1rem',
            display: 'flex', flexDirection: 'column', gap: '2px',
          }}>
            {navItems.map(item => {
              const isActive = page.view === item.page.view || (item.page.view === 'claims' && page.view === 'claim')
              return (
                <button
                  key={item.page.view}
                  onClick={() => handleNavigate(item.page)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', borderRadius: '8px', border: 'none',
                    background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text)',
                    fontSize: '0.9375rem', fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  {item.icon}{item.label}
                </button>
              )
            })}
            <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
            <div style={{ padding: '0.25rem 0.5rem' }}>
              <ThemeToggle />
            </div>
          </div>
        )}
      </header>

      {/* Body below navbar */}
      <div style={{ display: 'flex', flex: 1, paddingTop: '56px' }}>
        {/* Claim section sidebar — only visible in claim view, hidden on mobile */}
        {isClaimView && !isMobile && (
          <aside
            style={{
              width: '180px',
              flexShrink: 0,
              position: 'fixed',
              top: '56px',
              left: 0,
              bottom: 0,
              background: 'var(--surface)',
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 50,
              overflowY: 'auto',
            }}
          >
            {/* Back button */}
            <div style={{ padding: '0.75rem 0.75rem 0.5rem' }}>
              <button
                onClick={() => onNavigate({ view: 'claims' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'rgba(255,255,255,0.06)'
                  el.style.color = 'var(--text)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'transparent'
                  el.style.color = 'var(--text-muted)'
                }}
              >
                ← Sinistros
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border)', margin: '0 0.75rem 0.5rem' }} />

            {/* Section anchor links */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 0.5rem 1rem' }}>
              {claimSections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => {
                    const el = document.getElementById(sec.id)
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.375rem 0.625rem',
                    borderRadius: '5px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'rgba(255,255,255,0.06)'
                    el.style.color = 'var(--text)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLButtonElement
                    el.style.background = 'transparent'
                    el.style.color = 'var(--text-muted)'
                  }}
                >
                  {sec.label}
                </button>
              ))}
            </nav>
          </aside>
        )}

        {/* Main content */}
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--bg)',
            minHeight: 'calc(100vh - 56px)',
            marginLeft: isClaimView && !isMobile ? '180px' : '0',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
