import { useState, useRef, useEffect, type ReactNode } from 'react'
import type { Page } from '../App'
import { useTranslation } from '../i18n/context'
import { useCurrentUser } from '../auth'
import UserSwitcher from './UserSwitcher'

interface Props {
  page: Page
  onNavigate: (page: Page) => void
  children: ReactNode
}

export default function Layout({ page, onNavigate, children }: Props) {
  const { t, lang, setLang } = useTranslation()
  const { user } = useCurrentUser()
  const isOversight = user?.role === 'oversight'
  const hasFinanceAccess = user?.role === 'finance' || user?.role === 'oversight'
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const [reportsOpen, setReportsOpen] = useState(false)
  const reportsRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
      if (reportsRef.current && !reportsRef.current.contains(e.target as Node)) {
        setReportsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Determine which primary tab is active
  const activeTab = (page.view === 'project') ? 'search'
    : (page.view === 'member') ? 'team'
    : (page.view === 'requirement-book') ? 'more'
    : (page.view === 'task') ? 'search'
    : (page.view === 'add') ? 'more'
    : (page.view === 'requirements') ? 'more'
    : (page.view === 'company-teams') ? 'more'
    : (page.view === 'finance-report') ? 'reports'
    : (page.view === 'time-report') ? 'reports'
    : (page.view === 'reports') ? 'reports'
    : page.view as string

  // Is any "more" item active?
  const moreActive = activeTab === 'more'
  // Is any reports dropdown item active?
  const reportsActive = activeTab === 'reports'

  const hasBreadcrumb = page.view === 'project' || page.view === 'member' || page.view === 'requirement-book'

  function navigate(p: Page) {
    setMoreOpen(false)
    setReportsOpen(false)
    onNavigate(p)
  }

  return (
    <div className="portal">
      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-inner">
          <button className="topbar-brand" onClick={() => navigate({ view: 'home' })}>
            <span className="brand-logo">COBA</span>
            <span className="brand-divider" />
            <span className="brand-sub">Portal</span>
          </button>

          <nav className="topbar-nav">
            {/* Primary navigation */}
            <NavBtn active={activeTab === 'home'}    label={t('navHome')}    onClick={() => navigate({ view: 'home' })} />
            <NavBtn active={activeTab === 'search'}  label={t('navSearch')}  onClick={() => navigate({ view: 'search' })} />
            <NavBtn active={activeTab === 'team'}    label={t('navTeam')}    onClick={() => navigate({ view: 'team' })} />

            {/* "Reports" dropdown */}
            <div className={`nav-more${reportsOpen ? ' nav-more--open' : ''}`} ref={reportsRef}>
              <button
                className={`nav-btn nav-more-trigger${reportsActive ? ' nav-btn--active' : ''}`}
                onClick={() => setReportsOpen(v => !v)}
                aria-haspopup="true"
                aria-expanded={reportsOpen}
              >
                {t('navReports')}
                <span className="nav-more-chevron" aria-hidden="true">▾</span>
              </button>

              {reportsOpen && (
                <div className="nav-dropdown" role="menu">
                  <DropdownBtn
                    label={t('navReports')}
                    active={page.view === 'reports'}
                    onClick={() => navigate({ view: 'reports' })}
                  />
                  <DropdownBtn
                    label={t('timeReportNav')}
                    active={page.view === 'time-report'}
                    onClick={() => navigate({ view: 'time-report' })}
                  />
                  {hasFinanceAccess && (
                    <DropdownBtn
                      label={t('navFinance')}
                      active={page.view === 'finance-report'}
                      onClick={() => navigate({ view: 'finance-report' })}
                    />
                  )}
                </div>
              )}
            </div>

            {/* "More" dropdown for secondary items */}
            <div className={`nav-more${moreOpen ? ' nav-more--open' : ''}`} ref={moreRef}>
              <button
                className={`nav-btn nav-more-trigger${moreActive ? ' nav-btn--active' : ''}`}
                onClick={() => setMoreOpen(v => !v)}
                aria-haspopup="true"
                aria-expanded={moreOpen}
              >
                {t('navMore')}
                <span className="nav-more-chevron" aria-hidden="true">▾</span>
              </button>

              {moreOpen && (
                <div className="nav-dropdown" role="menu">
                  <DropdownBtn
                    label={t('navAdd')}
                    active={page.view === 'add'}
                    onClick={() => navigate({ view: 'add' })}
                  />
                  <DropdownBtn
                    label={t('navRequirements')}
                    active={page.view === 'requirements' || page.view === 'requirement-book'}
                    onClick={() => navigate({ view: 'requirements' })}
                  />
                  <div className="nav-dropdown-divider" />
                  <DropdownBtn
                    label={t('companyTeamsNav')}
                    active={page.view === 'company-teams'}
                    onClick={() => navigate({ view: 'company-teams' })}
                  />
                </div>
              )}
            </div>

            {/* Admin — oversight only, pushed to the right */}
            {isOversight && (
              <NavBtn
                active={activeTab === 'admin'}
                label={t('adminNav')}
                onClick={() => navigate({ view: 'admin' })}
                className="nav-btn--admin"
              />
            )}
          </nav>

          <button
            className="lang-btn"
            onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
          >
            {lang === 'pt' ? 'EN' : 'PT'}
          </button>
          <UserSwitcher />
        </div>
      </header>

      {/* Breadcrumb */}
      {hasBreadcrumb && (
        <div className="breadcrumb-bar">
          <div className="breadcrumb-inner">
            {page.view === 'project' && (
              <>
                <button className="breadcrumb-link" onClick={() => onNavigate({ view: 'search' })}>
                  {t('navSearch')}
                </button>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">{page.name ?? `#${page.id}`}</span>
              </>
            )}
            {page.view === 'member' && (
              <>
                <button className="breadcrumb-link" onClick={() => onNavigate({ view: 'team' })}>
                  {t('navTeam')}
                </button>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">{page.name ?? `#${page.id}`}</span>
              </>
            )}
            {page.view === 'requirement-book' && (
              <>
                <button className="breadcrumb-link" onClick={() => onNavigate({ view: 'requirements' })}>
                  {t('navRequirements')}
                </button>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-current">{page.title ?? `#${page.id}`}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="main">
        {children}
      </main>
    </div>
  )
}

function NavBtn({
  active,
  label,
  onClick,
  className = '',
}: {
  active: boolean
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      className={`nav-btn ${active ? 'nav-btn--active' : ''} ${className}`.trim()}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function DropdownBtn({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`nav-dropdown-item${active ? ' nav-dropdown-item--active' : ''}`}
      onClick={onClick}
      role="menuitem"
    >
      {label}
    </button>
  )
}
