import { describe, it, expect } from 'vitest'
import { pageToPath, pathToPage, type Page } from '../../types/pages'

// ── pageToPath ────────────────────────────────────────────────────────────────

describe('pageToPath', () => {
  it('home → /', () => {
    expect(pageToPath({ view: 'home' })).toBe('/')
  })

  it('search → /projects', () => {
    expect(pageToPath({ view: 'search' })).toBe('/projects')
  })

  it('add → /add', () => {
    expect(pageToPath({ view: 'add' })).toBe('/add')
  })

  it('reports → /reports', () => {
    expect(pageToPath({ view: 'reports' })).toBe('/reports')
  })

  it('project → /projects/:id', () => {
    expect(pageToPath({ view: 'project', id: 5 })).toBe('/projects/5')
  })

  it('project with name → /projects/:id (name not in path)', () => {
    expect(pageToPath({ view: 'project', id: 99, name: 'Test' })).toBe('/projects/99')
  })

  it('team → /team', () => {
    expect(pageToPath({ view: 'team' })).toBe('/team')
  })

  it('member → /team/:id', () => {
    expect(pageToPath({ view: 'member', id: 2 })).toBe('/team/2')
  })

  it('requirements → /requirements', () => {
    expect(pageToPath({ view: 'requirements' })).toBe('/requirements')
  })

  it('requirement-book → /requirements/:id', () => {
    expect(pageToPath({ view: 'requirement-book', id: 7 })).toBe('/requirements/7')
  })

  it('task → /projects/:projectId/tasks/:id', () => {
    expect(pageToPath({ view: 'task', id: 3, projectId: 5 })).toBe('/projects/5/tasks/3')
  })

  it('admin → /admin', () => {
    expect(pageToPath({ view: 'admin' })).toBe('/admin')
  })

  it('company-teams → /company-teams', () => {
    expect(pageToPath({ view: 'company-teams' })).toBe('/company-teams')
  })

  it('time-report → /time-report', () => {
    expect(pageToPath({ view: 'time-report' })).toBe('/time-report')
  })
})

// ── pathToPage ────────────────────────────────────────────────────────────────

describe('pathToPage', () => {
  it('/ → home', () => {
    expect(pathToPage('/')).toEqual({ view: 'home' })
  })

  it('/projects → search', () => {
    expect(pathToPage('/projects')).toEqual({ view: 'search' })
  })

  it('/add → add', () => {
    expect(pathToPage('/add')).toEqual({ view: 'add' })
  })

  it('/reports → reports', () => {
    expect(pathToPage('/reports')).toEqual({ view: 'reports' })
  })

  it('/team → team', () => {
    expect(pathToPage('/team')).toEqual({ view: 'team' })
  })

  it('/requirements → requirements', () => {
    expect(pathToPage('/requirements')).toEqual({ view: 'requirements' })
  })

  it('/admin → admin', () => {
    expect(pathToPage('/admin')).toEqual({ view: 'admin' })
  })

  it('/company-teams → company-teams', () => {
    expect(pathToPage('/company-teams')).toEqual({ view: 'company-teams' })
  })

  it('/time-report → time-report', () => {
    expect(pathToPage('/time-report')).toEqual({ view: 'time-report' })
  })

  it('/projects/5 → project with id 5', () => {
    expect(pathToPage('/projects/5')).toEqual({ view: 'project', id: 5 })
  })

  it('/team/2 → member with id 2', () => {
    expect(pathToPage('/team/2')).toEqual({ view: 'member', id: 2 })
  })

  it('/requirements/7 → requirement-book with id 7', () => {
    expect(pathToPage('/requirements/7')).toEqual({ view: 'requirement-book', id: 7 })
  })

  it('/projects/5/tasks/3 → task with id 3 and projectId 5', () => {
    expect(pathToPage('/projects/5/tasks/3')).toEqual({ view: 'task', id: 3, projectId: 5 })
  })

  it('trailing slash is stripped — /projects/ → search', () => {
    expect(pathToPage('/projects/')).toEqual({ view: 'search' })
  })

  it('unknown path falls back to home', () => {
    expect(pathToPage('/unknown/route')).toEqual({ view: 'home' })
  })

  it('unknown path with id pattern falls back to home', () => {
    expect(pathToPage('/other/123')).toEqual({ view: 'home' })
  })

  it('empty string falls back to home', () => {
    expect(pathToPage('')).toEqual({ view: 'home' })
  })
})

// ── round-trip ────────────────────────────────────────────────────────────────

describe('pageToPath / pathToPage round-trip', () => {
  const pages: Page[] = [
    { view: 'home' },
    { view: 'search' },
    { view: 'add' },
    { view: 'reports' },
    { view: 'project', id: 42 },
    { view: 'team' },
    { view: 'member', id: 7 },
    { view: 'requirements' },
    { view: 'requirement-book', id: 3 },
    { view: 'task', id: 10, projectId: 5 },
    { view: 'admin' },
    { view: 'company-teams' },
    { view: 'time-report' },
  ]

  for (const page of pages) {
    it(`round-trips ${page.view}`, () => {
      const path = pageToPath(page)
      const back = pathToPage(path)
      // Strip optional name/title/projectName which are not encoded in path
      const { view } = page
      expect(back.view).toBe(view)
      if ('id' in page && 'id' in back) expect(back.id).toBe(page.id)
      if ('projectId' in page && 'projectId' in back) expect(back.projectId).toBe(page.projectId)
    })
  }
})
