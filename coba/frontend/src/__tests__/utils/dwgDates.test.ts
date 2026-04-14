/**
 * dwgDates.test.ts
 *
 * Unit tests for the DWG TIMEBLL date scanning and patching utilities.
 *
 * DWG TIMEBLL format (little-endian, 8 bytes):
 *   bytes 0–3: uint32 Julian Day Number (integer part)
 *   bytes 4–7: uint32 milliseconds into that day (0 – 86 399 999)
 */

import { describe, it, expect } from 'vitest'
import {
  JD_DAY_MIN,
  JD_DAY_MAX,
  jdToIso,
  isoToJd,
  readTimeBll,
  writeTimeBll,
  scanDwgDates,
} from '../../utils/dwgDates'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build an ArrayBuffer containing a TIMEBLL field at the given offset.
 * Total buffer size = offset + 8.
 */
function makeTimeBllBuffer(dayPart: number, msPart: number, offset = 0): ArrayBuffer {
  const buf  = new ArrayBuffer(offset + 8)
  const view = new DataView(buf)
  view.setUint32(offset,     dayPart, true)
  view.setUint32(offset + 4, msPart,  true)
  return buf
}

// ── jdToIso ───────────────────────────────────────────────────────────────────

describe('jdToIso', () => {
  it('converts a known JD to the correct ISO date', () => {
    // JD 2451545.0 = J2000.0 = 2000-01-01 12:00 UTC → date part = 2000-01-01
    expect(jdToIso(2451545.0)).toBe('2000-01-01')
  })

  it('converts JD 2444239 (1980-01-01 midnight) to 1980-01-01', () => {
    // JD_DAY_MIN represents midnight 1980-01-01 with 0 ms
    const d = new Date((JD_DAY_MIN - 2440587.5) * 86_400_000)
    expect(jdToIso(JD_DAY_MIN)).toBe(d.toISOString().slice(0, 10))
  })
})

// ── isoToJd ───────────────────────────────────────────────────────────────────

describe('isoToJd', () => {
  it('round-trips with jdToIso', () => {
    const iso = '2024-06-15'
    const jd  = isoToJd(iso)
    expect(jdToIso(jd)).toBe(iso)
  })

  it('produces a JD in the expected range for a 2020 date', () => {
    const jd = isoToJd('2020-01-01')
    expect(jd).toBeGreaterThan(JD_DAY_MIN)
    expect(jd).toBeLessThan(JD_DAY_MAX)
  })
})

// ── readTimeBll ───────────────────────────────────────────────────────────────

describe('readTimeBll', () => {
  it('reads a valid TIMEBLL field and returns the combined JD', () => {
    const dayPart = 2457000  // within JD_DAY_MIN..JD_DAY_MAX
    const msPart  = 43_200_000  // noon

    const buf  = makeTimeBllBuffer(dayPart, msPart)
    const view = new DataView(buf)
    const jd   = readTimeBll(view, 0)

    expect(jd).not.toBeNull()
    expect(jd).toBeCloseTo(dayPart + msPart / 86_400_000, 8)
  })

  it('returns null when day part is below JD_DAY_MIN', () => {
    const buf  = makeTimeBllBuffer(JD_DAY_MIN - 1, 0)
    const view = new DataView(buf)
    expect(readTimeBll(view, 0)).toBeNull()
  })

  it('returns null when day part is above JD_DAY_MAX', () => {
    const buf  = makeTimeBllBuffer(JD_DAY_MAX + 1, 0)
    const view = new DataView(buf)
    expect(readTimeBll(view, 0)).toBeNull()
  })

  it('returns null when ms part equals 86 400 000 (a full day — invalid)', () => {
    const buf  = makeTimeBllBuffer(JD_DAY_MIN, 86_400_000)
    const view = new DataView(buf)
    expect(readTimeBll(view, 0)).toBeNull()
  })

  it('returns null when ms part exceeds 86 400 000', () => {
    const buf  = makeTimeBllBuffer(JD_DAY_MIN, 100_000_000)
    const view = new DataView(buf)
    expect(readTimeBll(view, 0)).toBeNull()
  })

  it('accepts ms part of 0 (midnight)', () => {
    const buf  = makeTimeBllBuffer(JD_DAY_MIN, 0)
    const view = new DataView(buf)
    const jd   = readTimeBll(view, 0)
    expect(jd).not.toBeNull()
    expect(jd).toBeCloseTo(JD_DAY_MIN, 10)
  })

  it('accepts ms part of 86 399 999 (last millisecond of day)', () => {
    const buf  = makeTimeBllBuffer(JD_DAY_MIN, 86_399_999)
    const view = new DataView(buf)
    const jd   = readTimeBll(view, 0)
    expect(jd).not.toBeNull()
  })

  it('reads from a non-zero offset correctly', () => {
    const dayPart = 2460000
    const msPart  = 1000
    const buf  = makeTimeBllBuffer(dayPart, msPart, 12)
    const view = new DataView(buf)

    // Before the field: should be null (zeros at offset 0)
    expect(readTimeBll(view, 0)).toBeNull()

    // At the field: should find the date
    const jd = readTimeBll(view, 12)
    expect(jd).not.toBeNull()
    expect(jd).toBeCloseTo(dayPart + msPart / 86_400_000, 8)
  })
})

// ── writeTimeBll ──────────────────────────────────────────────────────────────

describe('writeTimeBll', () => {
  it('round-trips: write then read back gives the same JD', () => {
    const jd  = isoToJd('2022-09-01')
    const buf  = new ArrayBuffer(8)
    const view = new DataView(buf)

    writeTimeBll(view, 0, jd)
    const jdBack = readTimeBll(view, 0)

    expect(jdBack).not.toBeNull()
    expect(jdBack!).toBeCloseTo(jd, 5)  // within ~1 second precision
  })

  it('writes the correct day and ms parts', () => {
    // 2024-06-15 noon UTC
    const jd      = 2460476.0  // dayPart = 2460476, msPart = 0
    const buf      = new ArrayBuffer(8)
    const view     = new DataView(buf)

    writeTimeBll(view, 0, jd)

    const dayWritten = view.getUint32(0, true)
    const msWritten  = view.getUint32(4, true)

    expect(dayWritten).toBe(2460476)
    expect(msWritten).toBe(0)
  })

  it('writes to a non-zero offset without clobbering surrounding bytes', () => {
    const buf  = new ArrayBuffer(16)
    const view = new DataView(buf)
    // Place sentinel values at the start and end
    view.setUint32(0,  0xDEADBEEF, true)
    view.setUint32(12, 0xCAFEBABE, true)

    writeTimeBll(view, 4, isoToJd('2023-03-10'))

    expect(view.getUint32(0,  true)).toBe(0xDEADBEEF)
    expect(view.getUint32(12, true)).toBe(0xCAFEBABE)
  })
})

// ── scanDwgDates ─────────────────────────────────────────────────────────────

describe('scanDwgDates', () => {
  it('finds a single TIMEBLL field in a synthetic buffer', () => {
    const dayPart = 2457568  // 2016-06-28
    const msPart  = 1_573_442

    const buf     = makeTimeBllBuffer(dayPart, msPart, 12)
    const results = scanDwgDates(buf)

    expect(results.length).toBe(1)
    expect(results[0].offset).toBe(12)
    expect(results[0].jd).toBeCloseTo(dayPart + msPart / 86_400_000, 6)
    expect(results[0].newIso).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(results[0].newIso).getFullYear()).toBe(2016)
  })

  it('returns an empty array when the buffer contains no valid TIMEBLL fields', () => {
    // All-zero buffer: day=0 which is below JD_DAY_MIN
    const buf = new ArrayBuffer(16)
    expect(scanDwgDates(buf).length).toBe(0)
  })

  it('deduplicates overlapping byte windows (skips 7 bytes after a hit)', () => {
    // Write the same TIMEBLL starting at offset 0 and also at offset 4 (overlapping)
    const dayPart = 2454804
    const msPart  = 75_541_737

    const buf  = new ArrayBuffer(12)
    const view = new DataView(buf)
    view.setUint32(0, dayPart, true)
    view.setUint32(4, msPart,  true)
    // Bytes 4–11: also write a shifted copy — the scanner must skip it
    view.setUint32(4, msPart,  true)
    view.setUint32(8, 0,       true)

    const results = scanDwgDates(buf)
    // Only the hit at offset 0 should be returned; the overlapping hit at 4 is skipped
    expect(results.length).toBe(1)
    expect(results[0].offset).toBe(0)
  })

  it('finds two non-overlapping TIMEBLL fields', () => {
    // Two fields packed at offsets 0 and 8
    const buf  = new ArrayBuffer(16)
    const view = new DataView(buf)

    const day1 = 2454804; const ms1 = 75_541_737
    const day2 = 2454811; const ms2 = 53_123_245

    view.setUint32(0,  day1, true)
    view.setUint32(4,  ms1,  true)
    view.setUint32(8,  day2, true)
    view.setUint32(12, ms2,  true)

    const results = scanDwgDates(buf)
    expect(results.length).toBe(2)
    expect(results[0].offset).toBe(0)
    expect(results[1].offset).toBe(8)
    expect(new Date(results[0].newIso).getFullYear()).toBe(2008)
    expect(new Date(results[1].newIso).getFullYear()).toBe(2008)
  })

  it('respects the 20-result cap', () => {
    // Pack 25 valid TIMEBLL fields consecutively
    const dayPart = 2454804
    const msPart  = 75_541_737

    const buf  = new ArrayBuffer(25 * 8)
    const view = new DataView(buf)
    for (let i = 0; i < 25; i++) {
      view.setUint32(i * 8,     dayPart, true)
      view.setUint32(i * 8 + 4, msPart,  true)
    }

    const results = scanDwgDates(buf)
    expect(results.length).toBe(20)
  })

  it('returns plausible ISO dates for every found candidate', () => {
    const buf  = new ArrayBuffer(16)
    const view = new DataView(buf)
    view.setUint32(0,  2460000, true)
    view.setUint32(4,  0,       true)
    view.setUint32(8,  2460008, true)
    view.setUint32(12, 0,       true)

    const results = scanDwgDates(buf)
    for (const r of results) {
      expect(r.newIso).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const year = new Date(r.newIso).getFullYear()
      expect(year).toBeGreaterThanOrEqual(1980)
      expect(year).toBeLessThanOrEqual(2050)
    }
  })
})
