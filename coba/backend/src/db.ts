// Re-export barrel — delegates to db/index.ts
// This file is kept so that router files using `import { db } from '../db'` continue to work.
// The Features Agent (Phase 2) will clean up router file imports once services are extracted.
export * from './db/index'
