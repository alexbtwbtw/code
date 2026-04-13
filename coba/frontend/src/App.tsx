import { useState, useCallback, useEffect } from 'react'
import Layout from './components/Layout'
import Home from './views/Home'
import SearchProjects from './views/SearchProjects'
import AddProject from './views/AddProject'
import Reports from './views/Reports'
import ProjectDetail from './views/ProjectDetail'
import TeamMembers from './views/TeamMembers'
import TeamMemberDetail from './views/TeamMemberDetail'
import Requirements, { RequirementBookDetail } from './views/Requirements'
import TaskDetail from './views/TaskDetail'
import CompanyTeams from './views/CompanyTeams'
import AdminPanel from './views/AdminPanel'
import TimeReport from './views/TimeReport'
import FinancialReport from './views/FinancialReport'
import { type Page, pageToPath, pathToPage } from './types/pages'

export type { Page }

// ──────────────────────────────────────────────────────────────────────────────

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

    // Replace current state so the first entry also has page data
    window.history.replaceState(page, '', pageToPath(page))

    return () => window.removeEventListener('popstate', onPop)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Layout page={page} onNavigate={navigate}>
      {page.view === 'home'             && <Home onNavigate={navigate} />}
      {page.view === 'search'           && <SearchProjects onNavigate={navigate} />}
      {page.view === 'add'              && <AddProject />}
      {page.view === 'reports'          && <Reports onNavigate={navigate} />}
      {page.view === 'project'          && <ProjectDetail id={page.id} onNavigate={navigate} />}
      {page.view === 'team'             && <TeamMembers onNavigate={navigate} />}
      {page.view === 'member'           && <TeamMemberDetail id={page.id} onNavigate={navigate} />}
      {page.view === 'requirements'     && <Requirements onNavigate={navigate} />}
      {page.view === 'requirement-book' && <RequirementBookDetail id={page.id} onNavigate={navigate} />}
      {page.view === 'task'             && <TaskDetail id={page.id} projectId={page.projectId} projectName={page.projectName} onNavigate={navigate} />}
      {page.view === 'company-teams'    && <CompanyTeams />}
      {page.view === 'admin'            && <AdminPanel />}
      {page.view === 'time-report'      && <TimeReport />}
      {page.view === 'finance-report'   && <FinancialReport />}
    </Layout>
  )
}
