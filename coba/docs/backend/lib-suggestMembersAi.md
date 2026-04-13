# lib/suggestMembersAi.ts

**Path:** `backend/src/lib/suggestMembersAi.ts`
**Layer:** Backend
**Purpose:** Calls the Claude API to rank team members for a given project using natural language reasoning.

## Overview

`suggestMembersAi` takes a project snapshot and an array of member snapshots, constructs a structured JSON prompt, and asks Claude to return the top N candidates in ranked order. The prompt instructs the model to consider relevant project categories, geographic experience, structure types worked on, and keyword overlap with the project description and tags. Rationale must be 1–2 sentences in Portuguese; evidence must be a verbatim quote from the candidate's `bio` field.

The response is stripped of markdown fences and parsed as a JSON array. The function validates that each element has a numeric `memberId` and a string `rationale` before returning.

This function is called by `router/requirements.ts` in the `matchMembers` procedure when `mode === 'ai'`.

### Mock / Real Dispatch

This function is called from `router/requirements.ts` only when `mode === 'ai'`. The router checks `USE_REAL_AI` and dispatches to either this function or the mock in `lib/mocks/suggestMembersAi.mock.ts`.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `suggestMembersAi` | async function | Main entry point — returns `Promise<AiSuggestion[]>` |
| `ProjectSnapshot` | TypeScript type | Project data passed to the AI: name, category, country, macroRegion, description, tags, structures array |
| `MemberSnapshot` | TypeScript type | Member data passed to the AI: id, name, title, bio, history array (with structures) |
| `AiSuggestion` | TypeScript type | `{ memberId, rationale, evidence }` — one result per ranked candidate |

## Dependencies

- `@anthropic-ai/sdk` — model `claude-sonnet-4-6`, `max_tokens: 2048`
- `@trpc/server` — `TRPCError` for error propagation back to tRPC callers

## Notes

- The function checks `ANTHROPIC_API_KEY` at invocation time and throws `INTERNAL_SERVER_ERROR` with a clear message if it is missing.
- The prompt asks for exactly `topN` results; Claude may return fewer if there are fewer candidates than `topN`.
- The result is filtered with `typeof s.memberId === 'number' && typeof s.rationale === 'string'` to drop malformed entries rather than throwing.
- Evidence is expected to be a verbatim bio quote; the instruction to not paraphrase is explicit in the prompt but not enforced programmatically.
- Unlike `parseCv`, this function does not apply a Zod schema to the AI response — it relies on primitive type checks.
