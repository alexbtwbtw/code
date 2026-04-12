import { describe, it, expect } from 'vitest'
import { fmt, fmtDate, fmtDim, initials } from '../../utils/format'

// ── fmt ───────────────────────────────────────────────────────────────────────

describe('fmt', () => {
  it('returns — for null', () => {
    expect(fmt(null, 'EUR')).toBe('—')
  })

  it('formats a number as currency', () => {
    const result = fmt(150000, 'EUR')
    // Should contain the number formatted with separators
    expect(result).toMatch(/150/)
    // Should not be the em-dash
    expect(result).not.toBe('—')
  })

  it('formats 0 as currency without returning —', () => {
    expect(fmt(0, 'EUR')).not.toBe('—')
  })

  it('handles large numbers', () => {
    const result = fmt(1000000, 'EUR')
    expect(result).toMatch(/1/)
    expect(result).not.toBe('—')
  })
})

// ── fmtDate ───────────────────────────────────────────────────────────────────

describe('fmtDate', () => {
  it('returns — for null', () => {
    expect(fmtDate(null)).toBe('—')
  })

  it('returns — for undefined', () => {
    expect(fmtDate(undefined)).toBe('—')
  })

  it('slices ISO timestamp to date portion', () => {
    expect(fmtDate('2024-06-15T12:00:00Z')).toBe('2024-06-15')
  })

  it('returns date string as-is if already a date', () => {
    expect(fmtDate('2024-01-01')).toBe('2024-01-01')
  })

  it('returns — for empty string', () => {
    expect(fmtDate('')).toBe('—')
  })
})

// ── fmtDim ────────────────────────────────────────────────────────────────────

describe('fmtDim', () => {
  it('returns null for null value', () => {
    expect(fmtDim('Length', null)).toBeNull()
  })

  it('formats label and value with m unit', () => {
    expect(fmtDim('Length', 120)).toBe('Length 120 m')
  })

  it('formats floating point value', () => {
    expect(fmtDim('Depth', 12.5)).toBe('Depth 12.5 m')
  })

  it('formats 0 correctly', () => {
    expect(fmtDim('Height', 0)).toBe('Height 0 m')
  })
})

// ── initials ──────────────────────────────────────────────────────────────────

describe('initials', () => {
  it('extracts initials from two-word name', () => {
    expect(initials('Alice Smith')).toBe('AS')
  })

  it('extracts initials from single word', () => {
    expect(initials('Alice')).toBe('A')
  })

  it('uses only first two words', () => {
    expect(initials('Alice Mary Smith')).toBe('AM')
  })

  it('handles extra whitespace gracefully', () => {
    expect(initials('  Bob   Jones  ')).toBe('BJ')
  })

  it('uppercases initials', () => {
    expect(initials('alice jones')).toBe('AJ')
  })

  it('handles empty string', () => {
    expect(initials('')).toBe('')
  })
})
