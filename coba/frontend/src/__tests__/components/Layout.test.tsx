import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'
import { LanguageProvider } from '../../i18n/context'
import Layout from '../../components/Layout'
import type { Page } from '../../types/pages'

// ── Mock UserSwitcher (uses tRPC — not relevant here) ─────────────────────────
vi.mock('../../components/UserSwitcher', () => ({
  default: () => null,
}))

// ── Mock auth (no localStorage in jsdom without setup) ───────────────────────
vi.mock('../../auth', () => ({
  useCurrentUser: () => ({ user: null, switchUser: vi.fn(), signOut: vi.fn() }),
}))

// ── Test helpers ──────────────────────────────────────────────────────────────

function renderLayout(page: Page, onNavigate = vi.fn()) {
  const children = createElement('div', null, 'content')
  return render(
    createElement(
      LanguageProvider,
      null,
      createElement(Layout, { page, onNavigate, children })
    )
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the COBA brand logo', () => {
    renderLayout({ view: 'home' })
    expect(screen.getByText('COBA')).toBeInTheDocument()
  })

  it('renders nav buttons in Portuguese by default', () => {
    renderLayout({ view: 'home' })
    // Portuguese nav labels
    expect(screen.getByText('Projetos')).toBeInTheDocument()
    expect(screen.getByText('Equipa')).toBeInTheDocument()
    expect(screen.getByText('Relatórios')).toBeInTheDocument()
  })

  it('language toggle button shows "EN" when lang is PT', () => {
    renderLayout({ view: 'home' })
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
  })

  it('clicking the language toggle switches to English nav labels', () => {
    renderLayout({ view: 'home' })
    const langBtn = screen.getByRole('button', { name: 'EN' })
    fireEvent.click(langBtn)
    // Now in English
    expect(screen.getByText('Projects')).toBeInTheDocument()
    // Button now shows "PT"
    expect(screen.getByRole('button', { name: 'PT' })).toBeInTheDocument()
  })

  it('clicking Search nav button calls onNavigate with search page', () => {
    const onNavigate = vi.fn()
    renderLayout({ view: 'home' }, onNavigate)
    fireEvent.click(screen.getByText('Projetos'))
    expect(onNavigate).toHaveBeenCalledWith({ view: 'search' })
  })

  it('clicking Team nav button calls onNavigate with team page', () => {
    const onNavigate = vi.fn()
    renderLayout({ view: 'home' }, onNavigate)
    fireEvent.click(screen.getByText('Equipa'))
    expect(onNavigate).toHaveBeenCalledWith({ view: 'team' })
  })

  it('clicking brand logo calls onNavigate with home page', () => {
    const onNavigate = vi.fn()
    renderLayout({ view: 'search' }, onNavigate)
    fireEvent.click(screen.getByText('COBA'))
    expect(onNavigate).toHaveBeenCalledWith({ view: 'home' })
  })

  it('renders children content', () => {
    renderLayout({ view: 'home' })
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('shows breadcrumb bar for project detail page', () => {
    renderLayout({ view: 'project', id: 5, name: 'My Project' })
    expect(screen.getByText('My Project')).toBeInTheDocument()
    // Breadcrumb bar class
    expect(document.querySelector('.breadcrumb-bar')).not.toBeNull()
  })

  it('does not show breadcrumb bar for home page', () => {
    renderLayout({ view: 'home' })
    expect(document.querySelector('.breadcrumb-bar')).toBeNull()
  })

  it('shows breadcrumb for member detail page', () => {
    renderLayout({ view: 'member', id: 3, name: 'Alice Smith' })
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('shows breadcrumb for requirement-book detail page', () => {
    renderLayout({ view: 'requirement-book', id: 7, title: 'Book One' })
    expect(screen.getByText('Book One')).toBeInTheDocument()
  })

  it('active nav button gets nav-btn--active class', () => {
    renderLayout({ view: 'reports' })
    const reportsBtn = screen.getByText('Relatórios').closest('button')
    expect(reportsBtn?.className).toContain('nav-btn--active')
  })

  it('does not show admin nav button for regular user', () => {
    renderLayout({ view: 'home' })
    // Admin button should not be visible when user is null (not oversight)
    expect(screen.queryByText('Admin')).toBeNull()
  })
})
