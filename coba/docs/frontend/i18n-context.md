# i18n/context.tsx

**Path:** `frontend/src/i18n/context.tsx`
**Layer:** Frontend
**Purpose:** React context-based internationalisation system; provides bilingual EN/PT translation to all components via the `useTranslation` hook.

## Overview

The i18n system is intentionally minimal. A `LanguageProvider` component wraps the app (via `main.tsx`) and holds the active language in React state, defaulting to Portuguese (`'pt'`). The `t` function looks up a key in the active language's dictionary and falls back to the key string itself if a translation is missing.

The translation dictionaries (`en.ts` and `pt.ts`) export plain objects with string values. `en.ts` also exports the `TranslationKey` type (the union of all key strings), which is used throughout the codebase to provide compile-time safety — passing an undefined key to `t()` is a type error.

The language toggle in `Layout.tsx` calls `setLang` directly from `useTranslation()`.

## Key Exports / Procedures

| Export | Type | Description |
|--------|------|-------------|
| `LanguageProvider` | React component | Context provider; wraps the entire app |
| `useTranslation` | React hook | Returns `{ lang, t, setLang }` |

## Dependencies

- `en` and `pt` translation dictionaries from sibling files `en.ts` and `pt.ts`
- `TranslationKey` type from `en.ts`
- React `createContext`, `useContext`, `useState`

## Notes

- The default language is hardcoded to `'pt'` in `useState<Language>('pt')`.
- The fallback `?? key` in the `t` function means missing translations are visible in the UI as the key name — useful for catching gaps in the translation files during development.
- With 313 translation keys, the dictionaries are large; adding new UI text requires entries in both `en.ts` and `pt.ts`.
- There is no language persistence (localStorage); the language resets to Portuguese on page reload.
