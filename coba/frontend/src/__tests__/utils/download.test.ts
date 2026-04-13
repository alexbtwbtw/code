import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We test the download logic in isolation by extracting the logic from download.ts.
// We mock the trpcClient and DOM APIs to avoid real HTTP calls.

// Because download.ts imports trpcClient at module load, we mock the module.
vi.mock('../../trpc', () => ({
  trpcClient: {
    team: {
      getCvData: {
        query: vi.fn(),
      },
    },
  },
}))

import { downloadSuggestionCv } from '../../utils/download'
import { trpcClient } from '../../trpc'

const mockQuery = trpcClient.team.getCvData.query as ReturnType<typeof vi.fn>

// ── DOM helper mocks ──────────────────────────────────────────────────────────

let createdAnchor: HTMLAnchorElement
let clickSpy: ReturnType<typeof vi.fn>
let revokeObjectURLSpy: ReturnType<typeof vi.fn>
let createObjectURLSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  clickSpy = vi.fn()
  createdAnchor = { click: clickSpy, href: '', download: '' } as unknown as HTMLAnchorElement

  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'a') return createdAnchor
    return document.createElement(tag)
  })

  createObjectURLSpy = vi.fn().mockReturnValue('blob:http://localhost/fake-url')
  revokeObjectURLSpy = vi.fn()
  URL.createObjectURL = createObjectURLSpy as typeof URL.createObjectURL
  URL.revokeObjectURL = revokeObjectURLSpy as typeof URL.revokeObjectURL
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── tests ──────────────────────────────────────────────────────────────────────

describe('downloadSuggestionCv', () => {
  it('returns early without clicking when data is null', async () => {
    mockQuery.mockResolvedValue(null)
    await downloadSuggestionCv(1, 'cv.pdf')
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('returns early when fileData is missing from base64 response', async () => {
    mockQuery.mockResolvedValue({ fileData: null })
    await downloadSuggestionCv(1, 'cv.pdf')
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('base64 mode: creates blob URL and triggers anchor click', async () => {
    // Minimal valid base64 for a few bytes
    const fakeBase64 = btoa('PDF content')
    mockQuery.mockResolvedValue({ fileData: fakeBase64 })

    await downloadSuggestionCv(42, 'member-cv.pdf')

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1)
    expect(createdAnchor.href).toBe('blob:http://localhost/fake-url')
    expect(createdAnchor.download).toBe('member-cv.pdf')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/fake-url')
  })

  it('S3 presigned-URL mode: sets href to presigned URL and clicks', async () => {
    const presignedUrl = 'https://s3.amazonaws.com/bucket/cv.pdf?X-Amz-Signature=abc'
    mockQuery.mockResolvedValue({ presignedUrl })

    await downloadSuggestionCv(7, 'presigned.pdf')

    expect(createdAnchor.href).toBe(presignedUrl)
    expect(createdAnchor.download).toBe('presigned.pdf')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    // No blob URL created in presigned mode
    expect(createObjectURLSpy).not.toHaveBeenCalled()
  })

  it('S3 mode: does not call URL.revokeObjectURL', async () => {
    mockQuery.mockResolvedValue({ presignedUrl: 'https://example.com/cv.pdf' })
    await downloadSuggestionCv(1, 'cv.pdf')
    expect(revokeObjectURLSpy).not.toHaveBeenCalled()
  })
})
