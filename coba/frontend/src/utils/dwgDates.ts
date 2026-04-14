/**
 * dwgDates.ts
 *
 * Pure utilities for scanning and patching DWG TIMEBLL date fields.
 *
 * DWG TIMEBLL format (little-endian, 8 bytes):
 *   bytes 0–3: uint32 Julian Day Number (integer part)
 *   bytes 4–7: uint32 milliseconds into that day (0 – 86 399 999)
 *
 * This is the format used by DWG header variables TDCREATE, TDUPDATE,
 * TDINDWG, and TDUUPDATE. It is NOT a single IEEE 754 double.
 *
 * Julian Day Number ↔ Unix epoch conversion:
 *   jd  → Date:  new Date((jd  - 2440587.5) * 86400000)
 *   Date → jd:   (date.getTime() / 86400000) + 2440587.5
 */

// Integer Julian Day Number bounds (the day field in TIMEBLL is always uint32)
export const JD_DAY_MIN = 2444239  // 1980-01-01
export const JD_DAY_MAX = 2469807  // 2050-01-01

/** Convert a Julian Day Number (possibly fractional) to an ISO date string (YYYY-MM-DD). */
export function jdToIso(jd: number): string {
  const d = new Date((jd - 2440587.5) * 86_400_000)
  return d.toISOString().slice(0, 10)
}

/** Convert an ISO date string (YYYY-MM-DD) back to a Julian Day Number. */
export function isoToJd(iso: string): number {
  return new Date(iso).getTime() / 86_400_000 + 2440587.5
}

/**
 * Read a DWG TIMEBLL field from a DataView at the given byte offset.
 * Returns the combined Julian Day Number, or null if the fields are out of range.
 */
export function readTimeBll(view: DataView, offset: number): number | null {
  const dayPart = view.getUint32(offset,     /* littleEndian= */ true)
  const msPart  = view.getUint32(offset + 4, /* littleEndian= */ true)
  if (dayPart < JD_DAY_MIN || dayPart > JD_DAY_MAX) return null
  if (msPart >= 86_400_000) return null
  return dayPart + msPart / 86_400_000
}

/**
 * Write a Julian Day Number back into a DWG TIMEBLL field in a DataView.
 * Splits into integer day part + millisecond remainder.
 */
export function writeTimeBll(view: DataView, offset: number, jd: number): void {
  const dayPart = Math.floor(jd)
  const msPart  = Math.round((jd - dayPart) * 86_400_000)
  view.setUint32(offset,     dayPart, /* littleEndian= */ true)
  view.setUint32(offset + 4, msPart,  /* littleEndian= */ true)
}

export interface DateCandidate {
  offset: number   // byte offset in the file
  jd: number       // original Julian Day Number (combined)
  newIso: string   // editable new date (ISO YYYY-MM-DD)
}

/**
 * Scan an ArrayBuffer for DWG TIMEBLL date fields.
 *
 * Stride is 1 (not 8) because DWG header dates are not guaranteed to be
 * 8-byte aligned. Overlapping windows within 7 bytes of an accepted hit
 * are skipped. Capped at 20 results for UI readability.
 */
export function scanDwgDates(buf: ArrayBuffer): DateCandidate[] {
  const view  = new DataView(buf)
  const found: DateCandidate[] = []
  let lastAccepted = -8

  for (let off = 0; off + 8 <= buf.byteLength; off++) {
    if (off < lastAccepted + 8) continue
    const jd = readTimeBll(view, off)
    if (jd !== null) {
      found.push({ offset: off, jd, newIso: jdToIso(jd) })
      lastAccepted = off
      if (found.length >= 20) break
    }
  }

  return found
}
