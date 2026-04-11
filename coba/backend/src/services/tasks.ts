import { db } from '../db'
import { type RawTask, type RawAssignment, type RawComment, mapTask, mapComment } from '../types/tasks'
import type { z } from 'zod'
import type { CreateTaskSchema, UpdateTaskSchema } from '../schemas/tasks'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getAssignees(taskId: number) {
  return (db.prepare(`
    SELECT ta.team_member_id, tm.name, tm.title
    FROM task_assignments ta
    JOIN team_members tm ON tm.id = ta.team_member_id
    WHERE ta.task_id = ?
    ORDER BY tm.name ASC
  `).all(taskId) as RawAssignment[]).map(a => ({
    memberId: a.team_member_id, name: a.name, title: a.title,
  }))
}

export function getComments(taskId: number) {
  return (db.prepare(`SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC`).all(taskId) as RawComment[]).map(mapComment)
}

export function getCommentCount(taskId: number) {
  return (db.prepare(`SELECT COUNT(*) as cnt FROM task_comments WHERE task_id = ?`).get(taskId) as { cnt: number }).cnt
}

// ── Cross-project queries ──────────────────────────────────────────────────────

type TaskWithProject = RawTask & { project_name: string; project_reference: string }

function mapTaskWithProject(t: TaskWithProject) {
  return {
    ...mapTask(t),
    assignees: getAssignees(t.id),
    commentCount: getCommentCount(t.id),
    projectName: t.project_name,
    projectReference: t.project_reference,
  }
}

export function getOverdue() {
  const today = new Date().toISOString().slice(0, 10)
  const tasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.ref_code as project_reference
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.due_date IS NOT NULL AND t.due_date < ? AND t.status != 'done'
    ORDER BY t.due_date ASC
  `).all(today) as TaskWithProject[]
  return tasks.map(mapTaskWithProject)
}

export function getNearDeadline() {
  const today = new Date().toISOString().slice(0, 10)
  const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const tasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.ref_code as project_reference
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.due_date IS NOT NULL AND t.due_date >= ? AND t.due_date <= ? AND t.status != 'done'
    ORDER BY t.due_date ASC
  `).all(today, in3days) as TaskWithProject[]
  return tasks.map(mapTaskWithProject)
}

export function getBlocked() {
  const tasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.ref_code as project_reference
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.status = 'blocked'
    ORDER BY t.due_date ASC NULLS LAST
  `).all() as TaskWithProject[]
  return tasks.map(mapTaskWithProject)
}

export function getMyOverdue(memberId: number) {
  const today = new Date().toISOString().slice(0, 10)
  const tasks = db.prepare(`
    SELECT DISTINCT t.*, p.name as project_name, p.ref_code as project_reference
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN task_assignments ta ON ta.task_id = t.id
    WHERE ta.team_member_id = ?
      AND t.due_date IS NOT NULL
      AND t.due_date < ?
      AND t.status != 'done'
    ORDER BY t.due_date ASC
  `).all(memberId, today) as TaskWithProject[]
  return tasks.map(mapTaskWithProject)
}

export function getMyNearDeadline(memberId: number) {
  const today = new Date().toISOString().slice(0, 10)
  const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const tasks = db.prepare(`
    SELECT DISTINCT t.*, p.name as project_name, p.ref_code as project_reference
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN task_assignments ta ON ta.task_id = t.id
    WHERE ta.team_member_id = ?
      AND t.due_date IS NOT NULL
      AND t.due_date >= ?
      AND t.due_date <= ?
      AND t.status != 'done'
    ORDER BY t.due_date ASC
  `).all(memberId, today, in3days) as TaskWithProject[]
  return tasks.map(mapTaskWithProject)
}

// ── Per-project queries ────────────────────────────────────────────────────────

export function getTasksByProject(projectId: number) {
  const tasks = db.prepare(`SELECT * FROM tasks WHERE project_id = ? ORDER BY
    CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 END,
    created_at DESC`).all(projectId) as RawTask[]
  return tasks.map(t => ({
    ...mapTask(t),
    assignees: getAssignees(t.id),
    commentCount: getCommentCount(t.id),
  }))
}

export function getTasksByMember(teamMemberId: number) {
  const tasks = db.prepare(`
    SELECT t.* FROM tasks t
    JOIN task_assignments ta ON ta.task_id = t.id
    WHERE ta.team_member_id = ?
    ORDER BY
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 END,
      t.created_at DESC
  `).all(teamMemberId) as RawTask[]
  return tasks.map(t => ({
    ...mapTask(t),
    assignees: getAssignees(t.id),
    commentCount: getCommentCount(t.id),
    projectName: (db.prepare(`SELECT name FROM projects WHERE id = ?`).get(t.project_id) as { name: string } | undefined)?.name ?? '',
  }))
}

export function getTaskById(id: number) {
  const row = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(id) as RawTask | undefined
  if (!row) return null
  return {
    ...mapTask(row),
    assignees: getAssignees(row.id),
    comments: getComments(row.id),
  }
}

export function createTask(input: z.infer<typeof CreateTaskSchema>) {
  const result = db.prepare(`
    INSERT INTO tasks (project_id, title, description, status, priority, state_summary, due_date)
    VALUES (@project_id, @title, @description, @status, @priority, @state_summary, @due_date)
  `).run({
    project_id: input.projectId, title: input.title, description: input.description,
    status: input.status, priority: input.priority, state_summary: input.stateSummary,
    due_date: input.dueDate ?? null,
  })
  const row = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(result.lastInsertRowid) as RawTask
  return { ...mapTask(row), assignees: [], comments: [] }
}

export function updateTask(input: z.infer<typeof UpdateTaskSchema>) {
  const existing = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(input.id) as RawTask | undefined
  if (!existing) throw new Error('Task not found')

  db.prepare(`
    UPDATE tasks SET
      title = @title, description = @description, status = @status,
      priority = @priority, state_summary = @state_summary, due_date = @due_date,
      updated_at = datetime('now')
    WHERE id = @id
  `).run({
    id: input.id,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    status: input.status ?? existing.status,
    priority: input.priority ?? existing.priority,
    state_summary: input.stateSummary ?? existing.state_summary,
    due_date: input.dueDate !== undefined ? input.dueDate : existing.due_date,
  })

  const row = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(input.id) as RawTask
  return { ...mapTask(row), assignees: getAssignees(row.id), comments: getComments(row.id) }
}

export function deleteTask(id: number) {
  db.prepare(`DELETE FROM tasks WHERE id = ?`).run(id)
  return { success: true }
}

export function assignTask(taskId: number, teamMemberId: number) {
  db.prepare(`INSERT OR IGNORE INTO task_assignments (task_id, team_member_id) VALUES (?, ?)`).run(taskId, teamMemberId)
  return { success: true }
}

export function unassignTask(taskId: number, teamMemberId: number) {
  db.prepare(`DELETE FROM task_assignments WHERE task_id = ? AND team_member_id = ?`).run(taskId, teamMemberId)
  return { success: true }
}

export function addComment(taskId: number, authorName: string, content: string) {
  const result = db.prepare(`INSERT INTO task_comments (task_id, author_name, content) VALUES (?, ?, ?)`)
    .run(taskId, authorName, content)
  const row = db.prepare(`SELECT * FROM task_comments WHERE id = ?`).get(result.lastInsertRowid) as RawComment
  return mapComment(row)
}

export function deleteComment(id: number) {
  db.prepare(`DELETE FROM task_comments WHERE id = ?`).run(id)
  return { success: true }
}
