import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'
import { LanguageProvider } from '../../i18n/context'
import EngineeringTools from '../../views/EngineeringTools'

// ── Mock WASM library (can't run in Node) ─────────────────────────────────────
vi.mock('@mlightcad/libredwg-web', () => ({ default: {} }))

// ── Mock the engineering API hooks ────────────────────────────────────────────
vi.mock('../../api/engineering', () => ({
  useDwgFiles:       vi.fn(),
  useUpdateDwgFile:  vi.fn(),
  useDeleteDwgFile:  vi.fn(),
  downloadDwg:       vi.fn(),
}))

// ── Mock the auth hook ────────────────────────────────────────────────────────
vi.mock('../../auth', () => ({
  useCurrentUser: vi.fn(),
}))

import { useDwgFiles, useUpdateDwgFile, useDeleteDwgFile } from '../../api/engineering'
import { useCurrentUser } from '../../auth'

const mockUseDwgFiles      = useDwgFiles      as ReturnType<typeof vi.fn>
const mockUseUpdateDwgFile = useUpdateDwgFile as ReturnType<typeof vi.fn>
const mockUseDeleteDwgFile = useDeleteDwgFile as ReturnType<typeof vi.fn>
const mockUseCurrentUser   = useCurrentUser   as ReturnType<typeof vi.fn>

// ── Sample data ───────────────────────────────────────────────────────────────

const sampleFiles = [
  {
    id: 1,
    projectId: null,
    fileName: 'foundation-plan.dwg',
    displayName: 'Foundation Plan',
    notes: 'Main foundation drawing',
    dwgVersion: '2018+',
    fileSize: 204800,
    uploadedAt: '2025-01-10T10:00:00',
  },
  {
    id: 2,
    projectId: 3,
    fileName: 'elevation.dwg',
    displayName: 'Elevation View',
    notes: '',
    dwgVersion: '2000',
    fileSize: 102400,
    uploadedAt: '2025-01-11T09:00:00',
  },
]

// ── Render helper ─────────────────────────────────────────────────────────────

function renderEngineeringTools() {
  return render(
    createElement(LanguageProvider, null, createElement(EngineeringTools)),
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EngineeringTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mutation stubs
    mockUseUpdateDwgFile.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseDeleteDwgFile.mockReturnValue({ mutate: vi.fn(), isPending: false })
    // Default: no logged-in user
    mockUseCurrentUser.mockReturnValue({ user: null, switchUser: vi.fn(), signOut: vi.fn() })
  })

  it('renders the upload drop zone', () => {
    mockUseDwgFiles.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() })

    renderEngineeringTools()

    // Drop-zone button is always rendered regardless of file list state
    const dropZone = document.querySelector('.eng-drop-zone')
    expect(dropZone).not.toBeNull()
  })

  it('shows "no files" state when the file list is empty', () => {
    mockUseDwgFiles.mockReturnValue({ data: [], isLoading: false, refetch: vi.fn() })

    renderEngineeringTools()

    // Portuguese translation for dwgNoFiles
    expect(screen.getByText('Nenhum ficheiro DWG carregado ainda.')).toBeInTheDocument()
  })

  it('shows file rows when files are returned', () => {
    mockUseDwgFiles.mockReturnValue({ data: sampleFiles, isLoading: false, refetch: vi.fn() })

    renderEngineeringTools()

    expect(screen.getByText('Foundation Plan')).toBeInTheDocument()
    expect(screen.getByText('Elevation View')).toBeInTheDocument()
  })

  it('does not show "no files" message when files exist', () => {
    mockUseDwgFiles.mockReturnValue({ data: sampleFiles, isLoading: false, refetch: vi.fn() })

    renderEngineeringTools()

    expect(screen.queryByText('Nenhum ficheiro DWG carregado ainda.')).toBeNull()
  })

  it('clicking a file row expands the metadata panel', () => {
    mockUseDwgFiles.mockReturnValue({ data: sampleFiles, isLoading: false, refetch: vi.fn() })

    renderEngineeringTools()

    // Before click, the expanded panel should not be visible
    expect(document.querySelector('.eng-expanded')).toBeNull()

    // Click the first file row
    const fileRows = document.querySelectorAll('.eng-file-row')
    expect(fileRows.length).toBe(2)
    fireEvent.click(fileRows[0])

    // After click, the expanded panel appears
    expect(document.querySelector('.eng-expanded')).not.toBeNull()
  })

  it('edit fields (display name, notes) are present in the expanded panel', () => {
    mockUseDwgFiles.mockReturnValue({ data: sampleFiles, isLoading: false, refetch: vi.fn() })

    renderEngineeringTools()

    // Click the first file row to expand
    const fileRows = document.querySelectorAll('.eng-file-row')
    fireEvent.click(fileRows[0])

    // The MetadataPanel should render the editable display name input
    const displayNameInput = document.querySelector<HTMLInputElement>('.eng-input')
    expect(displayNameInput).not.toBeNull()
    expect(displayNameInput!.value).toBe('Foundation Plan')

    // Notes textarea
    const notesTextarea = document.querySelector<HTMLTextAreaElement>('.eng-textarea')
    expect(notesTextarea).not.toBeNull()
    expect(notesTextarea!.value).toBe('Main foundation drawing')
  })

  it('shows loading indicator while data is loading', () => {
    mockUseDwgFiles.mockReturnValue({ data: undefined, isLoading: true, refetch: vi.fn() })

    renderEngineeringTools()

    // When loading, neither the empty state nor the file rows appear
    expect(screen.queryByText('Nenhum ficheiro DWG carregado ainda.')).toBeNull()
    expect(screen.queryByText('Foundation Plan')).toBeNull()
  })

  it('clicking an already-expanded row collapses the panel', () => {
    mockUseDwgFiles.mockReturnValue({ data: sampleFiles, isLoading: false, refetch: vi.fn() })

    renderEngineeringTools()

    const fileRows = document.querySelectorAll('.eng-file-row')
    // Expand
    fireEvent.click(fileRows[0])
    expect(document.querySelector('.eng-expanded')).not.toBeNull()
    // Collapse by clicking again
    fireEvent.click(fileRows[0])
    expect(document.querySelector('.eng-expanded')).toBeNull()
  })
})
