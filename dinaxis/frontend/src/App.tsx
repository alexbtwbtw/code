import { useState, useCallback, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './views/Dashboard'
import ClaimsList from './views/ClaimsList'
import ClaimDetail from './views/ClaimDetail'
import Insurers from './views/Insurers'
import Reports from './views/Reports'
import Experts from './views/Experts'

export type Page =
  | { view: 'dashboard' }
  | { view: 'claims' }
  | { view: 'claim'; id: string }
  | { view: 'insurers' }
  | { view: 'reports' }
  | { view: 'experts' }

function pageToPath(p: Page): string {
  switch (p.view) {
    case 'dashboard': return '/dinaxis/'
    case 'claims':    return '/dinaxis/claims'
    case 'claim':     return `/dinaxis/claims/${p.id}`
    case 'insurers':  return '/dinaxis/insurers'
    case 'reports':   return '/dinaxis/reports'
    case 'experts':   return '/dinaxis/experts'
  }
}

function pathToPage(path: string): Page {
  const p = path.replace(/^\/dinaxis/, '') || '/'
  if (p === '/' || p === '') return { view: 'dashboard' }
  if (p === '/claims') return { view: 'claims' }
  if (p.startsWith('/claims/')) return { view: 'claim', id: p.replace('/claims/', '') }
  if (p === '/insurers') return { view: 'insurers' }
  if (p === '/reports') return { view: 'reports' }
  if (p === '/experts') return { view: 'experts' }
  return { view: 'dashboard' }
}

export default function App() {
  const [page, setPage] = useState<Page>(() => pathToPage(window.location.pathname))

  const navigate = useCallback((p: Page) => {
    const path = pageToPath(p)
    window.history.pushState(p, '', path)
    setPage(p)
  }, [])

  useEffect(() => {
    const onPop = (ev: PopStateEvent) => {
      if (ev.state && typeof ev.state === 'object' && 'view' in ev.state) {
        setPage(ev.state as Page)
      } else {
        setPage(pathToPage(window.location.pathname))
      }
    }
    window.addEventListener('popstate', onPop)
    window.history.replaceState(page, '', pageToPath(page))
    return () => window.removeEventListener('popstate', onPop)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Layout page={page} onNavigate={navigate}>
      {page.view === 'dashboard' && <Dashboard onNavigate={navigate} />}
      {page.view === 'claims'    && <ClaimsList onNavigate={navigate} />}
      {page.view === 'claim'     && <ClaimDetail id={page.id} onNavigate={navigate} />}
      {page.view === 'insurers'  && <Insurers onNavigate={navigate} />}
      {page.view === 'reports'   && <Reports onNavigate={navigate} />}
      {page.view === 'experts'   && <Experts onNavigate={navigate} />}
    </Layout>
  )
}
