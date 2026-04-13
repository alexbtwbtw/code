# lib/parseCv.ts

**Path:** `backend/src/lib/parseCv.ts`
**Layer:** Backend
**Purpose:** Sends a PDF CV to the Claude API and extracts a structured member profile including project history, civil structures, and geographic features.

## Overview

`parseCv` accepts a base64-encoded PDF string, sends it to the Claude API as a `document` block alongside a detailed Portuguese-language prompt, and returns a validated `CvOutput` object.

The prompt instructs Claude to extract: full name, title, email, phone, a 3–5 sentence Portuguese bio, and a history array where each entry includes project name, location, category, dates, a role description, a list of civil structures encountered, and a list of project features (non-structural notable elements). The model is told to infer macro region and category from context.

The response is stripped of optional markdown code fences and parsed as JSON, then validated with `CvOutputSchema` (a Zod schema). If JSON parsing or Zod validation fails, a `TRPCError` with code `INTERNAL_SERVER_ERROR` is thrown.

### Mock / Real Dispatch

This function respects the `USE_REAL_AI` environment variable:
- `USE_REAL_AI=true` → calls the real Claude API
- Otherwise → imports and returns from `lib/mocks/parseCv.mock.ts` (deterministic mock output)

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `parseCv` | async function | Main entry point — takes `pdfBase64: string`, returns `Promise<CvOutput>` |
| `CvOutputSchema` | Zod schema | The output shape validated against Claude's response |
| `CvOutput` | TypeScript type | Inferred from `CvOutputSchema` |

## Dependencies

- `@anthropic-ai/sdk` — `Anthropic` client; model `claude-sonnet-4-6`, `max_tokens: 8192`
- `@trpc/server` — `TRPCError`
- `STRUCTURE_TYPES` from `../types/structures` — constrains the `type` field of extracted structures to valid enum values (`z.enum(STRUCTURE_TYPES).catch('other')`)
- `zod`

## Notes

- The model is `claude-sonnet-4-6` and `max_tokens` is set to 8192 — longer CVs with many projects may approach this limit.
- `z.enum(STRUCTURE_TYPES).catch('other')` allows Claude to return an unknown structure type without throwing; it silently falls back to `'other'`.
- The prompt is in Portuguese — responses will be in Portuguese regardless of the CV language.
- `geoEntries` are not in the output schema; only `structures` and `features` are extracted at the CV-parsing stage. Geo entries can be added manually in the history editor after import.
