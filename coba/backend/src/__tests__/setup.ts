import { db } from '../db'
import { beforeEach } from 'vitest'

// Safety guard — tests must never call the real Anthropic API
if (process.env.USE_REAL_AI === 'true') {
  throw new Error(
    'Tests cannot run with USE_REAL_AI=true. ' +
    'Remove or unset USE_REAL_AI before running the test suite.'
  )
}

export function resetDb() {
  db.exec(`
    DELETE FROM task_comments;
    DELETE FROM task_assignments;
    DELETE FROM tasks;
    DELETE FROM member_history_features;
    DELETE FROM member_history_structures;
    DELETE FROM member_history_geo;
    DELETE FROM member_history;
    DELETE FROM member_cvs;
    DELETE FROM project_team;
    DELETE FROM project_features;
    DELETE FROM structures;
    DELETE FROM geo_entries;
    DELETE FROM requirement_assignments;
    DELETE FROM requirements;
    DELETE FROM requirement_books;
    DELETE FROM time_entries;
    DELETE FROM project_fixed_costs;
    DELETE FROM member_rates;
    DELETE FROM company_team_members;
    DELETE FROM company_teams;
    DELETE FROM projects;
    DELETE FROM team_members;
  `)
}

beforeEach(() => resetDb())
