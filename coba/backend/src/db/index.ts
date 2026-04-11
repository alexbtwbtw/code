// Re-export db client so existing `import { db } from '../db'` paths resolve via db/index.ts
export { db } from './client'

// Run DDL — must be imported before any prepared statements
import './schema'

// Re-export all prepared statements
export { insertProject } from './statements/projects'
export { insertGeo } from './statements/geo'
export { insertStructure } from './statements/structures'
export { insertFeature } from './statements/features'
export { insertMember, insertProjectTeam, insertHistory, insertHistoryGeo, insertHistoryStructure, insertHistoryFeature } from './statements/team'
export { insertBook, insertRequirement } from './statements/requirements'
export { insertTask, insertTaskAssignment, insertTaskComment } from './statements/tasks'
