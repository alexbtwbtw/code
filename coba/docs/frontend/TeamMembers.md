# views/TeamMembers.tsx

**Path:** `frontend/src/views/TeamMembers.tsx`
**Layer:** Frontend
**Purpose:** Team member list view — shows all members in a card grid and handles two creation flows: manual entry and AI CV parsing.

## Overview

The view has three display modes controlled by a `FormMode` state: `'hidden'` (grid only), `'manual'` (inline member form), and `'cv-preview'` (AI-parsed CV review form).

**Manual flow:** The user fills name, title, email, phone, bio, and must attach a PDF CV file. On submit, `team.create` is called with the form data and the base64-encoded PDF.

**CV upload flow:** The user selects a PDF via a hidden file input. The file is immediately converted to base64 and sent to `team.parseCv` (which calls the Claude API). While parsing, a spinner banner is shown. On success, the form switches to `cv-preview` mode, pre-filling all fields from the parsed data. The user can review and edit the extracted profile and history entries (including removing individual structures or entire history entries) before submitting via `team.createWithHistory`.

Both flows attach the PDF to the created member record.

The member grid shows avatar initials, name, title, email, and tagged project count per member.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `TeamMembers` (default) | React component | Props: `{ onNavigate }` |
| `MemberFields` (internal) | React component | Reusable name/title/email/phone/bio form fields |

## Dependencies

- `trpc.team.list`, `trpc.team.create`, `trpc.team.createWithHistory`, `trpc.team.parseCv` (via `trpcClient` direct call)
- `useTranslation`

## Notes

- `parseCv` is called via the raw `trpcClient` (not `useMutation`) because it is invoked inside a `React.ChangeEvent` handler — the mutation hook pattern does not fit here as the call happens before the form mode switches.
- CV files are validated client-side: must be `application/pdf` and under 10 MB.
- The `fileToBase64` utility strips the `data:...;base64,` prefix from the FileReader result.
- History entries parsed from the CV can be individually deleted before creating the member; structures within each entry can also be removed.
- The `cv-preview` form does not support adding geo entries — those must be added later via `TeamMemberDetail`.
