/**
 * DwgViewer.test.tsx
 *
 * Tests for DwgViewerPane (rendered as part of EngineeringTools when a file row
 * is expanded and the "Preview" tab is active).
 *
 * Strategy: DwgViewerPane is a private component inside EngineeringTools.tsx, so
 * we test it indirectly by:
 *   1. Mocking `@mlightcad/libredwg-web` to control WASM behaviour.
 *   2. Mocking `../../api/engineering` so `fetchDwgBytes` returns a controlled
 *      ArrayBuffer.
 *   3. Rendering EngineeringTools, clicking a file row to expand it, then
 *      asserting on the viewer state.
 *
 * Error-code-64 regression: verifies that when the WASM module returns
 * result.error = 64 (DWG_ERR_VALUEOUTOFBOUNDS), the viewer shows the friendly
 * "Preview unavailable" message rather than a raw "error code: 64" string.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { LanguageProvider } from '../../i18n/context'
import EngineeringTools from '../../views/EngineeringTools'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Minimal valid ArrayBuffer that represents a dummy DWG payload. */
const FAKE_DWG_BUFFER = new Uint8Array([
  0x41, 0x43, 0x31, 0x30, 0x32, 0x34, // "AC1024" magic bytes
  0x00, 0x00, 0x00, 0x00,              // filler
]).buffer

// ── Mock: @mlightcad/libredwg-web ─────────────────────────────────────────────
//
// We mock the whole package. Each test can override `mockCreateModule` to
// return different {error, data} results.

const mockFsWriteFile = vi.fn()
const mockFsUnlink    = vi.fn()
const mockDwgReadFile = vi.fn()
const mockDwgFree     = vi.fn()
const mockConvert     = vi.fn()
const mockDwgToSvg    = vi.fn()

// LibreDwg.createByWasmInstance returns an object with convert + dwg_to_svg
const mockLibreDwgInstance = {
  convert:    mockConvert,
  dwg_to_svg: mockDwgToSvg,
  dwg_free:   mockDwgFree,
}

const mockWasmModule = {
  FS: {
    writeFile: mockFsWriteFile,
    unlink:    mockFsUnlink,
  },
  dwg_read_file: mockDwgReadFile,
}

// createModule resolves to the mock WASM module
const mockCreateModule = vi.fn().mockResolvedValue(mockWasmModule)

vi.mock('@mlightcad/libredwg-web', () => ({
  // createModule is the raw WASM factory used by readDwgToDatabase
  createModule: (...args: unknown[]) => mockCreateModule(...args),

  // LibreDwg.createByWasmInstance is used after a successful WASM read
  LibreDwg: {
    createByWasmInstance: vi.fn().mockReturnValue(mockLibreDwgInstance),
  },

  // Dwg_File_Type is not used in readDwgToDatabase but keep it for completeness
  Dwg_File_Type: { DWG: 0, DXF: 1 },
}))

// ── Mock: engineering API ─────────────────────────────────────────────────────

vi.mock('../../api/engineering', () => ({
  useDwgFiles:      vi.fn(),
  useUpdateDwgFile: vi.fn(),
  useDeleteDwgFile: vi.fn(),
  downloadDwg:      vi.fn(),
  fetchDwgBytes:    vi.fn(),
}))

// ── Mock: auth ────────────────────────────────────────────────────────────────

vi.mock('../../auth', () => ({
  useCurrentUser:   vi.fn(),
  getCurrentUser:   vi.fn().mockReturnValue(null),
}))

import {
  useDwgFiles,
  useUpdateDwgFile,
  useDeleteDwgFile,
  fetchDwgBytes,
} from '../../api/engineering'
import { useCurrentUser } from '../../auth'

const mockUseDwgFiles      = useDwgFiles      as ReturnType<typeof vi.fn>
const mockUseUpdateDwgFile = useUpdateDwgFile as ReturnType<typeof vi.fn>
const mockUseDeleteDwgFile = useDeleteDwgFile as ReturnType<typeof vi.fn>
const mockFetchDwgBytes    = fetchDwgBytes    as ReturnType<typeof vi.fn>
const mockUseCurrentUser   = useCurrentUser   as ReturnType<typeof vi.fn>

// ── Sample file list ──────────────────────────────────────────────────────────

const sampleFiles = [
  {
    id: 42,
    projectId: null,
    fileName: 'test.dwg',
    displayName: 'Test DWG',
    notes: '',
    dwgVersion: 'AC1024',
    fileSize: 145408,
    uploadedAt: '2025-01-10T10:00:00',
  },
]

// ── Render helper ─────────────────────────────────────────────────────────────

function renderET() {
  return render(
    createElement(LanguageProvider, null, createElement(EngineeringTools)),
  )
}

/** Expands the first file row and returns to caller for further assertions. */
function expandFirstRow() {
  const rows = document.querySelectorAll('.eng-file-row')
  expect(rows.length).toBeGreaterThanOrEqual(1)
  fireEvent.click(rows[0])
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('DwgViewerPane — error code 64 regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Standard hook stubs
    mockUseUpdateDwgFile.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseDeleteDwgFile.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseCurrentUser.mockReturnValue({ user: null, switchUser: vi.fn(), signOut: vi.fn() })
    mockUseDwgFiles.mockReturnValue({ data: sampleFiles, isLoading: false, refetch: vi.fn() })

    // fetchDwgBytes returns a controlled buffer
    mockFetchDwgBytes.mockResolvedValue(FAKE_DWG_BUFFER)
  })

  it('shows "Preview unavailable" when WASM returns error code 64 (DWG_ERR_VALUEOUTOFBOUNDS)', async () => {
    // Simulate: WASM parses the file but returns error code 64
    mockDwgReadFile.mockReturnValue({ error: 64, data: 0xdeadbeef })

    renderET()
    expandFirstRow()

    // Wait for the async WASM flow to complete and show the error state
    await waitFor(() => {
      expect(document.querySelector('.eng-viewer-placeholder--error')).not.toBeNull()
    }, { timeout: 3000 })

    // The friendly "Preview unavailable" title must be present
    expect(document.querySelector('.eng-viewer-error-title')).not.toBeNull()
    const errorBody = document.querySelector('.eng-viewer-error-body')
    expect(errorBody).not.toBeNull()

    // The raw "error code: 64" string must NOT be visible anywhere in the DOM
    expect(document.body.textContent).not.toContain('error code: 64')
    expect(document.body.textContent).not.toContain('error code:')
  })

  it('shows "Preview unavailable" when WASM returns any non-zero error code', async () => {
    // Simulate a different error: DWG_ERR_INVALIDDWG (2048)
    mockDwgReadFile.mockReturnValue({ error: 2048, data: 0 })

    renderET()
    expandFirstRow()

    await waitFor(() => {
      expect(document.querySelector('.eng-viewer-placeholder--error')).not.toBeNull()
    }, { timeout: 3000 })

    expect(document.body.textContent).not.toContain('error code')
    expect(document.body.textContent).not.toContain('2048')
  })

  it('shows "Preview unavailable" when WASM returns null data pointer', async () => {
    mockDwgReadFile.mockReturnValue({ error: 0, data: null })

    renderET()
    expandFirstRow()

    await waitFor(() => {
      expect(document.querySelector('.eng-viewer-placeholder--error')).not.toBeNull()
    }, { timeout: 3000 })

    expect(document.body.textContent).not.toContain('error code')
  })

  it('shows "Preview unavailable" when fetchDwgBytes rejects', async () => {
    mockFetchDwgBytes.mockRejectedValue(new Error('Network error'))

    renderET()
    expandFirstRow()

    await waitFor(() => {
      expect(document.querySelector('.eng-viewer-placeholder--error')).not.toBeNull()
    }, { timeout: 3000 })
  })

  it('renders SVG content on the happy path (error = 0, valid data)', async () => {
    const FAKE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="blue"/></svg>'

    // WASM reads successfully
    mockDwgReadFile.mockReturnValue({ error: 0, data: 0x1234 })
    // convert() returns a mock DB object
    mockConvert.mockReturnValue({ entities: [] })
    // dwg_to_svg() returns a valid SVG string
    mockDwgToSvg.mockReturnValue(FAKE_SVG)

    renderET()
    expandFirstRow()

    // Wait for the loading spinner to disappear (WASM call resolves)
    // The viewer transitions loading -> ok (SVG rendered) OR loading -> error
    // We accept either — what we must NOT see is the raw "error code" string.
    await waitFor(() => {
      const placeholder = document.querySelector('.eng-viewer-placeholder')
      const svgContainer = document.querySelector('.eng-svg-container')
      // Either the loading spinner is gone (status changed) or SVG appeared
      const loadingSpinner = document.querySelector('.eng-drop-spinner')
      // The loading state shows a spinner inside .eng-viewer-placeholder (without --error class)
      // Once WASM resolves, either .eng-svg-container appears (ok) or --error appears (error)
      expect(svgContainer !== null || placeholder === null || loadingSpinner === null).toBe(true)
    }, { timeout: 5000 })

    // On happy path, SVG container should be present
    await waitFor(() => {
      expect(document.querySelector('.eng-svg-container')).not.toBeNull()
    }, { timeout: 5000 })

    // The error placeholder must NOT be shown
    expect(document.querySelector('.eng-viewer-placeholder--error')).toBeNull()
    // The raw error string must not appear
    expect(document.body.textContent).not.toContain('error code')
  })

  it('shows "Preview unavailable" when convert() throws', async () => {
    // WASM reads OK but convert() crashes (e.g. malformed partial data)
    mockDwgReadFile.mockReturnValue({ error: 0, data: 0x1234 })
    mockConvert.mockImplementation(() => { throw new Error('convert crashed') })

    renderET()
    expandFirstRow()

    await waitFor(() => {
      expect(document.querySelector('.eng-viewer-placeholder--error')).not.toBeNull()
    }, { timeout: 3000 })

    expect(document.body.textContent).not.toContain('convert crashed')
    expect(document.body.textContent).not.toContain('error code')
  })

  it('shows "Preview unavailable" when dwg_to_svg() throws', async () => {
    mockDwgReadFile.mockReturnValue({ error: 0, data: 0x1234 })
    mockConvert.mockReturnValue({ entities: [] })
    mockDwgToSvg.mockImplementation(() => { throw new Error('svg generation failed') })

    renderET()
    expandFirstRow()

    await waitFor(() => {
      expect(document.querySelector('.eng-viewer-placeholder--error')).not.toBeNull()
    }, { timeout: 3000 })

    expect(document.body.textContent).not.toContain('svg generation failed')
  })
})

// ── Realistic libredwg-web SVG rendering ─────────────────────────────────────
//
// These tests use SVG payloads that mirror what @mlightcad/libredwg-web actually
// emits from svgConverter.js: a top-level <defs>, a top-level <g stroke="#000000"
// stroke-width="0.1%" fill="none" transform="matrix(1,0,0,-1,0,0)"> wrapping all
// model-space geometry, and NO background <rect>. The geometry strokes are pure
// black (#000000), which is invisible on COBA's dark navy background unless the
// viewer post-processing remaps them.

describe('DwgViewerPane — realistic libredwg SVG output', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUpdateDwgFile.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseDeleteDwgFile.mockReturnValue({ mutate: vi.fn(), isPending: false })
    mockUseCurrentUser.mockReturnValue({ user: null, switchUser: vi.fn(), signOut: vi.fn() })
    mockUseDwgFiles.mockReturnValue({ data: sampleFiles, isLoading: false, refetch: vi.fn() })
    mockFetchDwgBytes.mockResolvedValue(FAKE_DWG_BUFFER)
    mockDwgReadFile.mockReturnValue({ error: 0, data: 0x1234 })
    mockConvert.mockReturnValue({ entities: [] })
  })

  // The exact shape libredwg-web's svgConverter.toSvgString() returns for a
  // model space containing one rectangle outline and one line.
  const REALISTIC_SVG = `<?xml version="1.0"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"
  preserveAspectRatio="xMinYMin meet"
  viewBox="0 -100 200 100"
  width="100%" height="100%"
>
  <defs></defs>
  <g stroke="#000000" stroke-width="0.1%" fill="none" transform="matrix(1,0,0,-1,0,0)">
    <g id="ent1" stroke="rgb(255,255,255)" fill="none"><rect x="10" y="10" width="50" height="40"/></g>
    <g id="ent2" stroke="#000000" fill="none"><path d="M 0 0 L 100 100"/></g>
    <g id="ent3" stroke="#000000" fill="none"><line x1="0" y1="0" x2="50" y2="50"/></g>
  </g>
</svg>`

  it('preserves geometry inside the top-level <g> wrapper (does not strip rects as background)', async () => {
    mockDwgToSvg.mockReturnValue(REALISTIC_SVG)

    renderET()
    expandFirstRow()

    await waitFor(() => {
      expect(document.querySelector('.eng-svg-container svg')).not.toBeNull()
    }, { timeout: 5000 })

    const svg = document.querySelector('.eng-svg-container svg')!
    // Must keep the <path> (line geometry)
    expect(svg.querySelector('path')).not.toBeNull()
    // Must keep the <line>
    expect(svg.querySelector('line')).not.toBeNull()
    // Must keep the <rect> (it is real geometry, NOT a background fill)
    expect(svg.querySelector('rect')).not.toBeNull()
  })

  it('remaps black strokes so geometry is visible on the dark navy background', async () => {
    mockDwgToSvg.mockReturnValue(REALISTIC_SVG)

    renderET()
    expandFirstRow()

    await waitFor(() => {
      expect(document.querySelector('.eng-svg-container svg')).not.toBeNull()
    }, { timeout: 5000 })

    const svg = document.querySelector('.eng-svg-container svg')!
    // The injected SVG must NOT keep #000000 strokes, otherwise everything is
    // invisible against the navy background — that is the "blue screen" bug.
    const html = svg.outerHTML
    expect(html).not.toMatch(/stroke=["']#000000["']/i)
    expect(html).not.toMatch(/stroke=["']#000["']/i)
    expect(html).not.toMatch(/stroke=["']black["']/i)
  })

  it('still remaps white strokes (existing behaviour)', async () => {
    mockDwgToSvg.mockReturnValue(REALISTIC_SVG)

    renderET()
    expandFirstRow()

    await waitFor(() => {
      expect(document.querySelector('.eng-svg-container svg')).not.toBeNull()
    }, { timeout: 5000 })

    const html = document.querySelector('.eng-svg-container svg')!.outerHTML
    expect(html).not.toMatch(/rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/i)
    expect(html).not.toMatch(/#ffffff/i)
  })

  it('forces svg width/height to 100% so it fills the container', async () => {
    mockDwgToSvg.mockReturnValue(REALISTIC_SVG)

    renderET()
    expandFirstRow()

    await waitFor(() => {
      expect(document.querySelector('.eng-svg-container svg')).not.toBeNull()
    }, { timeout: 5000 })

    const svg = document.querySelector('.eng-svg-container svg')!
    expect(svg.getAttribute('width')).toBe('100%')
    expect(svg.getAttribute('height')).toBe('100%')
  })

  it('removes a leading full-size background <rect> if one is present', async () => {
    // Some converters may emit a background rect — verify that case still works.
    const SVG_WITH_BG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="0" y="0" width="100" height="100" fill="white"/>
  <g><path d="M 0 0 L 100 100" stroke="#000000"/></g>
</svg>`
    mockDwgToSvg.mockReturnValue(SVG_WITH_BG)

    renderET()
    expandFirstRow()

    await waitFor(() => {
      expect(document.querySelector('.eng-svg-container svg')).not.toBeNull()
    }, { timeout: 5000 })

    const svg = document.querySelector('.eng-svg-container svg')!
    // The geometry path must survive
    expect(svg.querySelector('path')).not.toBeNull()
    // The leading background rect must be removed
    expect(svg.querySelector('rect')).toBeNull()
  })
})

// ── dwgErrorMessage unit tests ────────────────────────────────────────────────
//
// We can't import dwgErrorMessage directly (it's private), but we can verify
// the behaviour indirectly by checking that the viewer never exposes raw codes.
// The tests above already cover the key paths. If the function is ever exported
// (e.g. for a tooltip), add direct unit tests here.
