import { db } from '../client'

const _insertProject = db.prepare(`
  INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority,
    start_date, end_date, budget, currency, project_manager, team_size, description, tags)
  VALUES (@ref_code, @name, @client, @macro_region, @country, @place, @category, @status, @priority,
    @start_date, @end_date, @budget, @currency, @project_manager, @team_size, @description, @tags)
`)

// Wraps the prepared statement to supply defaults for optional fields
export const insertProject = {
  run: (data: Record<string, unknown>) => _insertProject.run({
    end_date: null,
    budget: null,
    project_manager: '',
    team_size: 0,
    ...data,
  }),
}
