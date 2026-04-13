# router/requirements.ts

**Path:** `backend/src/router/requirements.ts`
**Layer:** Backend
**Purpose:** tRPC router for requirement books and individual staffing requirements, plus local and AI-powered member matching. Delegates DB logic to `services/requirements.ts` and `services/matching.ts`.

## Overview

The requirements system is two-level: a `requirement_book` is a named collection optionally linked to a project, and each book contains `requirements` that specify a discipline, seniority level, years of experience, and certifications needed.

The `matchMembers` procedure is the most complex operation in this router. In `local` mode, it delegates to `services/matching.ts` which scores each team member against a single requirement using keyword matching on bios/titles, category-to-discipline affinity, years of experience (estimated from history count), and certification keywords. In `ai` mode, the same data is sent to `lib/suggestMembersAi.ts` which calls the Claude API with a structured prompt. Both modes return the same response shape.

The router also handles AI-powered requirement extraction from uploaded documents via `parseRequirements` — this accepts a PDF or DOCX and uses the Claude API to generate a fully-populated requirement book.

## Key Exports / Procedures

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `listBooks` | query | — | All requirement books with requirement count and linked project name/refCode. |
| `bookById` | query | `{ id }` | Single book with its requirements array and linked project object. |
| `createBook` | mutation | `BookInputSchema` | Create a new requirement book. |
| `updateBook` | mutation | `BookInputSchema + id` | Update a book's title, projectId, category, description. |
| `deleteBook` | mutation | `{ id }` | Delete a book (cascades to requirements). |
| `createRequirement` | mutation | `RequirementInputSchema` | Add a requirement to a book. |
| `updateRequirement` | mutation | `RequirementInputSchema + id` | Update a requirement's fields. |
| `deleteRequirement` | mutation | `{ id }` | Delete a single requirement. |
| `matchMembers` | mutation | `{ requirementId, mode: 'ai'\|'local', topN }` | Rank all team members for a single requirement. Returns up to `topN` (max 20) with `rationale` and `evidence`. |
| `parseRequirements` | mutation | `{ fileBase64, fileType: 'pdf'\|'docx' }` | Extract a full requirement book from an uploaded document using the Claude API (or mock). |

## Exported Constants (from `schemas/requirements.ts`)

| Export | Description |
|--------|-------------|
| `DISCIPLINES` | Const tuple: `geotechnical`, `structural`, `environmental`, `hydraulic`, `transport`, `electrical`, `planning`, `other` |
| `LEVELS` | Const tuple: `any`, `junior`, `mid`, `senior`, `lead` |

## Dependencies

- `services/requirements.ts` — books/requirements CRUD, local scoring
- `services/matching.ts` — `suggestMembersLocal`, `matchMembersLocal`, `extractVerbatimEvidence`
- `lib/suggestMembersAi.ts` — AI member ranking (with mock dispatch via `USE_REAL_AI`)
- `lib/parseRequirements.ts` — AI requirement extraction from PDF/DOCX (with mock dispatch)
- `schemas/requirements.ts` — Zod schemas and constants

## Notes

- AI mode reads `ANTHROPIC_API_KEY` from `process.env`; throws `INTERNAL_SERVER_ERROR` if missing.
- `matchMembers` is a `mutation` rather than a `query` because it may call the Claude API (token usage, async).
- `parseRequirements` supports both PDF (sent as a document block to Claude) and DOCX (converted to plain text via `mammoth` first).
- `DISCIPLINE_KEYWORDS` and `LEVEL_KEYWORDS` in the matching service cover both Portuguese and English terms to handle bilingual bios.
