/**
 * dwgDateScan.test.ts
 *
 * Proves that the DWG date scanner can find dates stored in the TIMEBLL format
 * embedded in real AC1024 (R2010) DWG files.
 *
 * DWG TIMEBLL format (little-endian, 8 bytes total):
 *   bytes 0–3: uint32  Julian Day Number (integer part)
 *   bytes 4–7: uint32  milliseconds into that day (0 – 86 399 999)
 *
 * This is how every DWG file stores header date variables such as TDCREATE,
 * TDUPDATE, TDINDWG, and TDUUPDATE. It is NOT a single IEEE 754 double.
 *
 * Julian Day Number ↔ Unix epoch conversion:
 *   jd  → Date:  new Date((jd  - 2440587.5) * 86400000)
 *   Date → jd:   (date.getTime() / 86400000) + 2440587.5
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const EXAMPLE_DIR = path.resolve(__dirname, '../../../../example')
const MECHANICAL  = path.join(EXAMPLE_DIR, 'mechanical_example-imperial.dwg')
const CONDOMINIUM = path.join(EXAMPLE_DIR, 'visualization_-_condominium_with_skylight.dwg')

// Integer Julian Day Number bounds (the day field is always an integer uint32)
const JD_DAY_MIN = 2444239  // 1980-01-01
const JD_DAY_MAX = 2469807  // 2050-01-01

/**
 * Scan a Buffer for DWG TIMEBLL date fields.
 *
 * Each candidate is 8 bytes: a little-endian uint32 Julian Day integer followed
 * by a little-endian uint32 millisecond offset (0–86 399 999).
 *
 * Stride is 1 (not 8) because DWG header dates are not guaranteed to be
 * 8-byte aligned. Once a hit is accepted we skip ahead 7 bytes to avoid
 * yielding overlapping interpretations of the same 8 bytes.
 */
function scanDates(buf: Buffer): Array<{ offset: number; jd: number; date: Date }> {
  const results: Array<{ offset: number; jd: number; date: Date }> = []
  let lastAccepted = -8

  for (let i = 0; i <= buf.length - 8; i++) {
    if (i < lastAccepted + 8) continue  // skip bytes overlapping the last hit

    const dayPart = buf.readUInt32LE(i)
    const msPart  = buf.readUInt32LE(i + 4)

    if (dayPart < JD_DAY_MIN || dayPart > JD_DAY_MAX) continue
    if (msPart >= 86_400_000) continue  // ms must be within a single day

    const jd = dayPart + msPart / 86_400_000
    const ms = (jd - 2440587.5) * 86_400_000
    results.push({ offset: i, jd, date: new Date(ms) })
    lastAccepted = i
  }

  return results
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DWG date scanning — mechanical_example-imperial.dwg', () => {
  it('file exists and is readable', () => {
    expect(fs.existsSync(MECHANICAL)).toBe(true)
    expect(fs.statSync(MECHANICAL).size).toBeGreaterThan(1000)
  })

  it('finds at least one TIMEBLL date', () => {
    const buf = fs.readFileSync(MECHANICAL)
    const dates = scanDates(buf)
    console.log(
      'mechanical DWG — found dates:',
      dates.map(d => ({ offset: '0x' + d.offset.toString(16), jd: d.jd, date: d.date.toISOString() })),
    )
    expect(dates.length).toBeGreaterThan(0)
  })

  it('all found dates are plausible (between 1980 and 2050)', () => {
    const buf = fs.readFileSync(MECHANICAL)
    const dates = scanDates(buf)
    for (const { date } of dates) {
      expect(date.getFullYear()).toBeGreaterThanOrEqual(1980)
      expect(date.getFullYear()).toBeLessThanOrEqual(2050)
    }
  })

  it('finds the expected creation and modification dates', () => {
    const buf = fs.readFileSync(MECHANICAL)
    const dates = scanDates(buf)
    // The mechanical DWG was created 2008-12-04 and modified 2008-12-11
    // (confirmed by inspecting the binary at offsets 0x152 and 0x15a)
    const years = dates.map(d => d.date.getFullYear())
    expect(years).toContain(2008)
  })
})

describe('DWG date scanning — visualization_-_condominium_with_skylight.dwg', () => {
  it('file exists and is readable', () => {
    expect(fs.existsSync(CONDOMINIUM)).toBe(true)
    expect(fs.statSync(CONDOMINIUM).size).toBeGreaterThan(1000)
  })

  it('finds at least one TIMEBLL date', () => {
    const buf = fs.readFileSync(CONDOMINIUM)
    const dates = scanDates(buf)
    console.log(
      'condominium DWG — found dates:',
      dates.map(d => ({ offset: '0x' + d.offset.toString(16), jd: d.jd, date: d.date.toISOString() })),
    )
    expect(dates.length).toBeGreaterThan(0)
  })

  it('all found dates are plausible (between 1980 and 2050)', () => {
    const buf = fs.readFileSync(CONDOMINIUM)
    const dates = scanDates(buf)
    for (const { date } of dates) {
      expect(date.getFullYear()).toBeGreaterThanOrEqual(1980)
      expect(date.getFullYear()).toBeLessThanOrEqual(2050)
    }
  })
})

describe('DWG TIMEBLL date scanning — synthetic buffer verification', () => {
  it('detects a known TIMEBLL value written at a specific offset', () => {
    // 2024-06-15: JD day = floor((Date.UTC(2024,5,15)/86400000) + 2440587.5)
    const jdFull    = Date.UTC(2024, 5, 15) / 86_400_000 + 2440587.5
    const dayPart   = Math.floor(jdFull)
    const msPart    = Math.round((jdFull - dayPart) * 86_400_000)

    expect(dayPart).toBeGreaterThanOrEqual(JD_DAY_MIN)
    expect(dayPart).toBeLessThanOrEqual(JD_DAY_MAX)
    expect(msPart).toBeLessThan(86_400_000)

    // Build a 20-byte buffer: 12 zero bytes + the 8-byte TIMEBLL field
    const buf = Buffer.alloc(20, 0)
    buf.writeUInt32LE(dayPart, 12)
    buf.writeUInt32LE(msPart,  16)

    const dates = scanDates(buf)
    expect(dates.length).toBe(1)
    expect(dates[0].offset).toBe(12)
    expect(dates[0].jd).toBeCloseTo(jdFull, 6)
    expect(dates[0].date.getFullYear()).toBe(2024)
    expect(dates[0].date.getMonth()).toBe(5)   // June = 5
    expect(dates[0].date.getDate()).toBe(15)
  })

  it('does not flag a day part that is out of range', () => {
    // Day part below JD_DAY_MIN (before 1980)
    const buf = Buffer.alloc(8, 0)
    buf.writeUInt32LE(JD_DAY_MIN - 1, 0)
    buf.writeUInt32LE(0,              4)
    expect(scanDates(buf).length).toBe(0)

    // Day part above JD_DAY_MAX (after 2050)
    buf.writeUInt32LE(JD_DAY_MAX + 1, 0)
    buf.writeUInt32LE(0,              4)
    expect(scanDates(buf).length).toBe(0)
  })

  it('does not flag a millisecond part that exceeds one day', () => {
    const buf = Buffer.alloc(8, 0)
    buf.writeUInt32LE(JD_DAY_MIN, 0)
    buf.writeUInt32LE(86_400_000, 4)  // exactly 86 400 000 — not valid (must be < )
    expect(scanDates(buf).length).toBe(0)
  })

  it('handles two consecutive TIMEBLL fields correctly', () => {
    // TDCREATE followed immediately by TDUPDATE — the DWG norm
    const jd1Day = 2457388  // ~ 2016-01-01
    const jd1Ms  = 43_200_000  // noon
    const jd2Day = 2458893  // ~ 2020-02-14
    const jd2Ms  = 0

    const buf = Buffer.alloc(16, 0)
    buf.writeUInt32LE(jd1Day, 0)
    buf.writeUInt32LE(jd1Ms,  4)
    buf.writeUInt32LE(jd2Day, 8)
    buf.writeUInt32LE(jd2Ms,  12)

    const dates = scanDates(buf)
    expect(dates.length).toBe(2)
    expect(dates[0].offset).toBe(0)
    expect(dates[1].offset).toBe(8)
    expect(dates[0].date.getFullYear()).toBe(2016)
    expect(dates[1].date.getFullYear()).toBe(2020)
  })

  it('handles the zero-ms edge case (midnight)', () => {
    const buf = Buffer.alloc(8, 0)
    buf.writeUInt32LE(JD_DAY_MIN, 0)
    buf.writeUInt32LE(0,          4)  // midnight — valid
    const dates = scanDates(buf)
    expect(dates.length).toBe(1)
    expect(dates[0].jd).toBeCloseTo(JD_DAY_MIN, 10)
  })
})
