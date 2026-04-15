export type Page =
  | { view: 'home' }
  | { view: 'search' }
  | { view: 'add' }
  | { view: 'reports' }
  | { view: 'project'; id: number; name?: string }
  | { view: 'team' }
  | { view: 'member'; id: number; name?: string }
  | { view: 'requirements' }
  | { view: 'requirement-book'; id: number; title?: string }
  | { view: 'task'; id: number; projectId: number; projectName?: string }
  | { view: 'admin' }
  | { view: 'company-teams' }
  | { view: 'time-report' }
  | { view: 'finance-report' }
  | { view: 'engineering' }

// ── URL ↔ Page mapping ──────────────────────────────────────────────────────

export function pageToPath(page: Page): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') // e.g. '/coba'
  if (page.view === 'home') return import.meta.env.BASE_URL // e.g. '/coba/'
  switch (page.view) {
    case 'search':           return `${base}/projects`
    case 'add':              return `${base}/add`
    case 'reports':          return `${base}/reports`
    case 'project':          return `${base}/projects/${page.id}`
    case 'team':             return `${base}/team`
    case 'member':           return `${base}/team/${page.id}`
    case 'requirements':     return `${base}/requirements`
    case 'requirement-book': return `${base}/requirements/${page.id}`
    case 'task':             return `${base}/projects/${page.projectId}/tasks/${page.id}`
    case 'admin':            return `${base}/admin`
    case 'company-teams':    return `${base}/company-teams`
    case 'time-report':      return `${base}/time-report`
    case 'finance-report':   return `${base}/finance`
    case 'engineering':      return `${base}/engineering`
  }
}

export function pathToPage(path: string): Page {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '') // e.g. '/coba'
  const stripped = path.startsWith(base) ? path.slice(base.length) || '/' : path
  const s = stripped.replace(/\/+$/, '') || '/'

  if (s === '/')              return { view: 'home' }
  if (s === '/projects')      return { view: 'search' }
  if (s === '/add')           return { view: 'add' }
  if (s === '/reports')       return { view: 'reports' }
  if (s === '/team')          return { view: 'team' }
  if (s === '/requirements')  return { view: 'requirements' }
  if (s === '/admin')         return { view: 'admin' }
  if (s === '/company-teams') return { view: 'company-teams' }
  if (s === '/time-report')   return { view: 'time-report' }
  if (s === '/finance')       return { view: 'finance-report' }
  if (s === '/engineering')   return { view: 'engineering' }

  let m: RegExpMatchArray | null

  m = s.match(/^\/projects\/(\d+)\/tasks\/(\d+)$/)
  if (m) return { view: 'task', id: Number(m[2]), projectId: Number(m[1]) }

  m = s.match(/^\/projects\/(\d+)$/)
  if (m) return { view: 'project', id: Number(m[1]) }

  m = s.match(/^\/team\/(\d+)$/)
  if (m) return { view: 'member', id: Number(m[1]) }

  m = s.match(/^\/requirements\/(\d+)$/)
  if (m) return { view: 'requirement-book', id: Number(m[1]) }

  return { view: 'home' }
}
