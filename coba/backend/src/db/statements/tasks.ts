import { db } from '../client'

export const insertTask = db.prepare(`
  INSERT INTO tasks (project_id, title, description, status, priority, state_summary, due_date)
  VALUES (@project_id, @title, @description, @status, @priority, @state_summary, @due_date)
`)

export const insertTaskAssignment = db.prepare(`
  INSERT OR IGNORE INTO task_assignments (task_id, team_member_id)
  VALUES (@task_id, @team_member_id)
`)

export const insertTaskComment = db.prepare(`
  INSERT INTO task_comments (task_id, author_name, content)
  VALUES (@task_id, @author_name, @content)
`)
