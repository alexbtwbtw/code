# lib/parseRequirements.ts

**Path:** `backend/src/lib/parseRequirements.ts`
**Layer:** Backend
**Purpose:** Extracts a structured requirement book from an uploaded document (PDF or DOCX) using the Claude API.

## Overview

`parseRequirementsFromPdf` and `parseRequirementsFromDocx` each accept a base64-encoded file, send the content to Claude with a Portuguese-language prompt, and return a validated `RequirementsOutput` object containing a book title, category, description, and an array of individual requirements.

For PDF files, the document is sent as a native `document` block in the Claude message. For DOCX files, `mammoth` is used to extract plain text from the Word document first, which is then sent as inline text in the prompt.

### Mock / Real Dispatch

Both functions respect `USE_REAL_AI`:
- `USE_REAL_AI=true` → calls the real Claude API
- Otherwise → imports and returns from `lib/mocks/parseRequirements.mock.ts`

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `parseRequirementsFromPdf` | async function | Takes `fileBase64: string`, returns `Promise<RequirementsOutput>` |
| `parseRequirementsFromDocx` | async function | Takes `docxBase64: string`, extracts text via mammoth, returns `Promise<RequirementsOutput>` |
| `RequirementsOutputSchema` | Zod schema | The output shape: `bookTitle`, `bookCategory`, `bookDescription`, `requirements[]` |
| `RequirementsOutput` | TypeScript type | Inferred from `RequirementsOutputSchema` |

## Dependencies

- `@anthropic-ai/sdk` — `Anthropic` client; model `claude-sonnet-4-6`, `max_tokens: 4096`
- `mammoth` — DOCX to plain-text extraction
- `@trpc/server` — `TRPCError`
- `DISCIPLINES`, `LEVELS` from `../schemas/requirements` — constrain enum values in output schema
- `zod`

## Notes

- The prompt instructs Claude to copy verbatim `sourceEvidence` excerpts from the original document for each extracted requirement — useful for traceability.
- `bookCategory` maps to the same 6-value enum as `requirement_books.category`.
- For DOCX files, if `mammoth` returns empty text (corrupted file), a `BAD_REQUEST` error is thrown before calling the API.
- `z.enum(...).catch(...)` is used on `discipline`, `level`, and `bookCategory` so unknown enum values fall back gracefully rather than throwing.
