import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { LanguageProvider } from '../../i18n/context'
import SearchProjects from '../../views/SearchProjects'

// ── Mock the API layer ────────────────────────────────────────────────────────
vi.mock('../../api/projects', () => ({
  useProjectsList: vi.fn(),
}))

import { useProjectsList } from '../../api/projects'
const mockUseProjectsList = useProjectsList as ReturnType<typeof vi.fn>

// ── Sample project data ───────────────────────────────────────────────────────

const sampleProjects = [
  {
    id: 1,
    refCode: 'P-001',
    name: 'Test Bridge Project',
    client: 'ACME Corp',
    macroRegion: 'EMEA',
    country: 'Portugal',
    place: 'Lisbon',
    category: 'transport',
    status: 'active',
    priority: 'high',
    projectManager: 'Alice',
    startDate: '2024-01-01',
    endDate: null,
    budget: 1000000,
    currency: 'EUR',
    totalHours: 0,
    teamSize: 3,
    tags: '',
    description: 'Bridge project',
    updatedAt: '2024-01-01',
    createdAt: '2024-01-01',
  },
  {
    id: 2,
    refCode: 'P-002',
    name: 'Water Treatment Plant',
    client: 'City Council',
    macroRegion: 'NA',
    country: 'Spain',
    place: 'Madrid',
    category: 'water',
    status: 'planning',
    priority: 'medium',
    projectManager: 'Bob',
    startDate: null,
    endDate: null,
    budget: null,
    currency: 'EUR',
    totalHours: 0,
    teamSize: 2,
    tags: '',
    description: 'Water plant',
    updatedAt: '2024-01-01',
    createdAt: '2024-01-01',
  },
]

// ── Wrapper ───────────────────────────────────────────────────────────────────

function renderSearchProjects(onNavigate = vi.fn()) {
  return render(
    createElement(
      LanguageProvider,
      null,
      createElement(SearchProjects, { onNavigate })
    )
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SearchProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    mockUseProjectsList.mockReturnValue({ data: undefined, isLoading: true })
    renderSearchProjects()
    expect(screen.getByText(/Carregando|Loading|…/i)).toBeInTheDocument()
  })

  it('renders no-results message when project list is empty', () => {
    mockUseProjectsList.mockReturnValue({ data: [], isLoading: false })
    renderSearchProjects()
    // PT no-results label
    expect(screen.getByText('Nenhum projeto encontrado.')).toBeInTheDocument()
  })

  it('renders project cards on success', () => {
    mockUseProjectsList.mockReturnValue({ data: sampleProjects, isLoading: false })
    renderSearchProjects()
    expect(screen.getByText('Test Bridge Project')).toBeInTheDocument()
    expect(screen.getByText('Water Treatment Plant')).toBeInTheDocument()
  })

  it('renders project ref codes', () => {
    mockUseProjectsList.mockReturnValue({ data: sampleProjects, isLoading: false })
    renderSearchProjects()
    expect(screen.getByText('P-001')).toBeInTheDocument()
    expect(screen.getByText('P-002')).toBeInTheDocument()
  })

  it('renders client names', () => {
    mockUseProjectsList.mockReturnValue({ data: sampleProjects, isLoading: false })
    renderSearchProjects()
    expect(screen.getByText('ACME Corp')).toBeInTheDocument()
    expect(screen.getByText('City Council')).toBeInTheDocument()
  })

  it('clicking a project card calls onNavigate with project view and id', () => {
    const onNavigate = vi.fn()
    mockUseProjectsList.mockReturnValue({ data: sampleProjects, isLoading: false })
    renderSearchProjects(onNavigate)

    const cards = screen.getAllByRole('button', { name: /Test Bridge Project/i })
    fireEvent.click(cards[0])
    expect(onNavigate).toHaveBeenCalledWith({ view: 'project', id: 1, name: 'Test Bridge Project' })
  })

  it('renders search input', () => {
    mockUseProjectsList.mockReturnValue({ data: [], isLoading: false })
    renderSearchProjects()
    // The search input has a Portuguese placeholder
    const input = screen.getByPlaceholderText(/Pesquise/i)
    expect(input).toBeInTheDocument()
  })

  it('renders filter selects', () => {
    mockUseProjectsList.mockReturnValue({ data: [], isLoading: false })
    renderSearchProjects()
    const selects = screen.getAllByRole('combobox')
    // Status, category, sort selects
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })

  it('count label shows project count', () => {
    mockUseProjectsList.mockReturnValue({ data: sampleProjects, isLoading: false })
    renderSearchProjects()
    // The search-sub paragraph contains "2 projetos"
    const sub = document.querySelector('.search-sub')
    expect(sub?.textContent).toContain('2')
  })
})
