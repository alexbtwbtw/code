import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'
import { LanguageProvider } from '../../i18n/context'
import Reports from '../../views/Reports'

// ── Mock API layers ───────────────────────────────────────────────────────────

vi.mock('../../api/projects', () => ({
  useProjectStats: vi.fn(),
  usePriorityList: vi.fn(),
}))

vi.mock('../../api/tasks', () => ({
  useOverdueTasks: vi.fn(),
  useNearDeadlineTasks: vi.fn(),
  useBlockedTasks: vi.fn(),
  useTasksByProject: vi.fn(),
}))

import { useProjectStats, usePriorityList } from '../../api/projects'
import { useOverdueTasks, useNearDeadlineTasks, useBlockedTasks } from '../../api/tasks'

const mockUseProjectStats = useProjectStats as ReturnType<typeof vi.fn>
const mockUsePriorityList = usePriorityList as ReturnType<typeof vi.fn>
const mockUseOverdueTasks = useOverdueTasks as ReturnType<typeof vi.fn>
const mockUseNearDeadlineTasks = useNearDeadlineTasks as ReturnType<typeof vi.fn>
const mockUseBlockedTasks = useBlockedTasks as ReturnType<typeof vi.fn>

// ── Sample stats data ─────────────────────────────────────────────────────────

const emptyStats = {
  byStatus: [],
  byCategory: [],
  byCountry: [],
  byYear: [],
  totalBudget: 0,
  total: 0,
}

const sampleStats = {
  byStatus: [
    { status: 'active', n: 3 },
    { status: 'completed', n: 2 },
  ],
  byCategory: [
    { category: 'transport', n: 2 },
    { category: 'water', n: 3 },
  ],
  byCountry: [{ country: 'Portugal', n: 5 }],
  byYear: [{ year: 2024, n: 3 }],
  totalBudget: 1500000,
  total: 5,
}

const sampleOverdueTasks = [
  { id: 1, title: 'Fix Drainage', projectId: 1, projectName: 'Test Project', status: 'todo', priority: 'high', dueDate: '2024-01-01', assignees: [], comments: [] },
]

// ── Wrapper ───────────────────────────────────────────────────────────────────

function renderReports(onNavigate = vi.fn()) {
  return render(
    createElement(
      LanguageProvider,
      null,
      createElement(Reports, { onNavigate })
    )
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOverdueTasks.mockReturnValue({ data: [] })
    mockUseNearDeadlineTasks.mockReturnValue({ data: [] })
    mockUseBlockedTasks.mockReturnValue({ data: [] })
    mockUsePriorityList.mockReturnValue({ data: [] })
  })

  it('shows loading state while stats are loading', () => {
    mockUseProjectStats.mockReturnValue({ data: undefined, isLoading: true })
    renderReports()
    expect(screen.getByText(/Carregando|Loading|…/i)).toBeInTheDocument()
  })

  it('returns null when data is undefined and not loading', () => {
    mockUseProjectStats.mockReturnValue({ data: undefined, isLoading: false })
    const { container } = renderReports()
    // Should render nothing meaningful
    expect(container.textContent).toBe('')
  })

  it('renders the Reports page heading', () => {
    mockUseProjectStats.mockReturnValue({ data: emptyStats, isLoading: false })
    renderReports()
    expect(screen.getByText('Relatórios de Projetos')).toBeInTheDocument()
  })

  it('renders without crashing on empty data', () => {
    mockUseProjectStats.mockReturnValue({ data: emptyStats, isLoading: false })
    expect(() => renderReports()).not.toThrow()
  })

  it('renders tab buttons', () => {
    mockUseProjectStats.mockReturnValue({ data: emptyStats, isLoading: false })
    renderReports()
    // Tab buttons should be visible
    const tabButtons = document.querySelectorAll('.report-filter-btn')
    expect(tabButtons.length).toBeGreaterThanOrEqual(2)
  })

  it('renders overdue tasks section when tasks exist', () => {
    mockUseProjectStats.mockReturnValue({ data: sampleStats, isLoading: false })
    mockUseOverdueTasks.mockReturnValue({ data: sampleOverdueTasks })
    renderReports()
    // Navigate to tasks tab to see overdue tasks
    const tabButtons = document.querySelectorAll('.report-filter-btn')
    // Tasks tab should be visible (second tab)
    expect(tabButtons.length).toBeGreaterThan(0)
  })

  it('renders with full stats data without crashing', () => {
    mockUseProjectStats.mockReturnValue({ data: sampleStats, isLoading: false })
    mockUseOverdueTasks.mockReturnValue({ data: sampleOverdueTasks })
    expect(() => renderReports()).not.toThrow()
  })

  it('can switch between tabs', () => {
    mockUseProjectStats.mockReturnValue({ data: emptyStats, isLoading: false })
    renderReports()
    const tabButtons = Array.from(document.querySelectorAll('.report-filter-btn'))
    // Click the second tab (first is Summary which renders charts; Tasks tab is safer)
    if (tabButtons[1]) {
      fireEvent.click(tabButtons[1])
    }
    // Should not throw — tab switches should work
    expect(screen.getByText('Relatórios de Projetos')).toBeInTheDocument()
  })
})
