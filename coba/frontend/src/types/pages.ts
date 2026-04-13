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

// ── URL ↔ Page mapping ──────────────────────────────────────────────────────

export function pageToPath(page: Page): string {
  switch (page.view) {
    case 'home':             return '/'
    case 'search':           return '/projects'
    case 'add':              return '/add'
    case 'reports':          return '/reports'
    case 'project':          return `/projects/${page.id}`
    case 'team':             return '/team'
    case 'member':           return `/team/${page.id}`
    case 'requirements':     return '/requirements'
    case 'requirement-book': return `/requirements/${page.id}`
    case 'task':             return `/projects/${page.projectId}/tasks/${page.id}`
    case 'admin':            return '/admin'
    case 'company-teams':    return '/company-teams'
    case 'time-report':      return '/time-report'
    case 'finance-report':   return '/finance'
  }
}

export function pathToPage(path: string): Page {
  const s = path.replace(/\/+$/, '') || '/'

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
