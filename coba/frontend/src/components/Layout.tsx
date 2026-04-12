import type { ReactNode } from 'react'
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

  const activeTab = (page.view === 'project') ? 'search'
    : (page.view === 'member') ? 'team'
    : (page.view === 'requirement-book') ? 'requirements'
    : (page.view === 'task') ? 'search'
    : page.view as string

  const hasBreadcrumb = page.view === 'project' || page.view === 'member' || page.view === 'requirement-book'

  return (
    <div className="portal">
      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-inner">
          <button className="topbar-brand" onClick={() => onNavigate({ view: 'home' })}>
            <span className="brand-logo">COBA</span>
            <span className="brand-divider" />
            <span className="brand-sub">Portal</span>
          </button>

          <nav className="topbar-nav">
            <NavBtn active={activeTab === 'home'}         label={t('navHome')}         onClick={() => onNavigate({ view: 'home' })} />
            <NavBtn active={activeTab === 'search'}       label={t('navSearch')}       onClick={() => onNavigate({ view: 'search' })} />
            <NavBtn active={activeTab === 'add'}          label={t('navAdd')}          onClick={() => onNavigate({ view: 'add' })} />
            <NavBtn active={activeTab === 'team'}         label={t('navTeam')}         onClick={() => onNavigate({ view: 'team' })} />
            <NavBtn active={activeTab === 'requirements'} label={t('navRequirements')} onClick={() => onNavigate({ view: 'requirements' })} />
            <NavBtn active={activeTab === 'reports'}       label={t('navReports')}       onClick={() => onNavigate({ view: 'reports' })} />
            <NavBtn active={activeTab === 'time-report'}   label={t('timeReportNav')}    onClick={() => onNavigate({ view: 'time-report' })} />
            <NavBtn active={activeTab === 'company-teams'} label={t('companyTeamsNav')} onClick={() => onNavigate({ view: 'company-teams' })} />
            {isOversight && (
              <NavBtn active={activeTab === 'admin'} label={t('adminNav')} onClick={() => onNavigate({ view: 'admin' })} />
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

function NavBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`nav-btn ${active ? 'nav-btn--active' : ''}`} onClick={onClick}>
      {label}
    </button>
  )
}
