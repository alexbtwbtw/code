# lib/generateCv.ts

**Path:** `backend/src/lib/generateCv.ts`
**Layer:** Backend
**Purpose:** Generates a formatted A4 PDF curriculum vitae for a team member using pdfkit.

## Overview

`generateCvPdf` accepts a `CvMember` data object and streams pdfkit output into a Buffer that is returned as a Promise. The PDF uses a dark navy and steel blue colour scheme matching the COBA portal brand.

The layout consists of:
1. **Header block** — member name (large, navy), title (blue), and a contact row with email and phone separated by a pipe character.
2. **Horizontal rule** — 2pt blue line.
3. **Profile section** — bio text, justified, if present.
4. **Project Experience section** — one entry per history item, each showing: project name (bold, left) with date range (right), a sub-line with country / macro region / category in italic, a description paragraph, an optional "Investigação Geotécnica" bullet list (geo entries), and an optional "Estruturas" bullet list (structures with dimensions).
5. **Footer** — page number and "COBA — Curriculum Vitae — {name}" on every page.

Page breaks are triggered manually when the cursor is within 100pt of the bottom of the page.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `generateCvPdf` | async function | Takes `CvMember`, returns `Promise<Buffer>` containing the PDF bytes |
| `CvMember` | TypeScript type | Input shape: name, title, email, phone, bio, history array |

## Dependencies

- `pdfkit` — PDF generation; A4 size, `autoFirstPage: true`

## Notes

- The function uses only the four built-in pdfkit fonts (`Helvetica`, `Helvetica-Bold`, `Helvetica-Oblique`) to avoid embedding custom fonts and keep file sizes small.
- The `addFooter` helper saves and restores `doc.y` so footer content does not disturb the main text flow.
- `pageAdded` events increment the page counter for footer numbering; the last page footer is written just before `doc.end()`.
- Geo entries in the CV omit latitude/longitude to keep the output concise.
- The usable content width is computed as `doc.page.width - MARGIN * 2` (483pt on A4).
