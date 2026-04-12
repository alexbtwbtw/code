import { describe, it, expect } from 'vitest'
import { extractVerbatimEvidence } from '../../services/matching'

describe('extractVerbatimEvidence', () => {
  it('returns empty string when no keywords', () => {
    expect(extractVerbatimEvidence('Some text about engineering.', [])).toBe('')
  })

  it('returns empty string when text is empty', () => {
    expect(extractVerbatimEvidence('', ['soil'])).toBe('')
  })

  it('returns a matching sentence for keyword', () => {
    const text = 'I specialize in soil mechanics. I have 10 years of experience.'
    const result = extractVerbatimEvidence(text, ['soil'])
    expect(result).toContain('soil mechanics')
  })

  it('returns at most 2 sentences', () => {
    const text = 'Expert in geotechnical engineering. Specialist in soil mechanics. Foundation design pro.'
    const result = extractVerbatimEvidence(text, ['geotechnical', 'soil'])
    const sentences = result.split(' … ').filter(Boolean)
    expect(sentences.length).toBeLessThanOrEqual(2)
  })

  it('handles multi-sentence text split by newlines', () => {
    const text = 'Geotechnical expert.\nSoil mechanics specialist.\nOther experience.'
    const result = extractVerbatimEvidence(text, ['geotechnical'])
    expect(result).toContain('Geotechnical')
  })

  it('is case-insensitive for matching', () => {
    const text = 'Expert in GEOTECHNICAL engineering.'
    const result = extractVerbatimEvidence(text, ['geotechnical'])
    expect(result).toContain('GEOTECHNICAL')
  })

  it('does not duplicate sentences', () => {
    const text = 'Expert in geotechnical engineering. Senior geotechnical consultant.'
    const result = extractVerbatimEvidence(text, ['geotechnical', 'geotechnical'])
    // Should not contain the same sentence twice
    const parts = result.split(' … ')
    const unique = new Set(parts)
    expect(unique.size).toBe(parts.length)
  })
})
