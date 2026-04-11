# router/requirements.ts

**Path:** `backend/src/router/requirements.ts`
**Layer:** Backend
**Purpose:** tRPC router for requirement books and individual staffing requirements, plus local and AI-powered member matching.

## Overview

The requirements system is two-level: a `requirement_book` is a named collection optionally linked to a project, and each book contains `requirements` that specify a discipline, seniority level, years of experience, and certifications needed.

The `matchMembers` procedure is the most complex operation in this router. In `local` mode, it scores each team member against a single requirement using keyword matching on bios/titles (via `DISCIPLINE_KEYWORDS` and `LEVEL_KEYWORDS` dictionaries), category-to-discipline affinity (`CAT_DISCIPLINE` map), years of experience (estimated from history count), and certification keywords. In `ai` mode, the same data is sent to the Claude API with a structured prompt, and the model returns ranked candidates with Portuguese-language rationale.

Both modes return the same response shape so the frontend can switch between them transparently.

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
| `matchMembers` | mutation | `{ requirementId, mode: 'ai'|'local', topN }` | Rank all team members for a single requirement. Returns up to `topN` results (max 20) with `rationale` and `evidence`. |

## Exported Constants

| Export | Description |
|--------|-------------|
| `DISCIPLINES` | Const tuple: `geotechnical`, `structural`, `environmental`, `hydraulic`, `transport`, `electrical`, `planning`, `other` |
| `LEVELS` | Const tuple: `any`, `junior`, `mid`, `senior`, `lead` |

## Dependencies

- `db` from `../db`
- `@anthropic-ai/sdk` — used only in `ai` mode of `matchMembers`
- `@trpc/server` — `TRPCError` for `NOT_FOUND` and `INTERNAL_SERVER_ERROR`
- `zod`

## Notes

- AI mode reads `ANTHROPIC_API_KEY` from `process.env` at call time and throws `INTERNAL_SERVER_ERROR` if it is missing or set to the placeholder value.
- The AI prompt requests responses in Portuguese and asks for verbatim bio excerpts as evidence.
- `DISCIPLINE_KEYWORDS` covers both Portuguese and English terms to handle bilingual bios.
- The local `scoreRequirement` function estimates years of experience by comparing `req.yearsExperience` to `Math.ceil(yearsExperience / 3)` history entries — a rough heuristic.
- `matchMembers` is a `mutation` rather than a `query` because it may call the Claude API with side effects (token usage), and the AI invocation is async.
