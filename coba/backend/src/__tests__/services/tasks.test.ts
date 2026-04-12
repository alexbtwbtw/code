import { describe, it, expect } from 'vitest'
import { db } from '../../db'
import {
  createTask, getTaskById, updateTask, deleteTask,
  assignTask, unassignTask, addComment, deleteComment,
  getTasksByProject, getOverdue, getNearDeadline, getBlocked,
} from '../../services/tasks'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeProject(refCode = 'P-001') {
  return Number(db.prepare(`
    INSERT INTO projects (ref_code, name, client, macro_region, country, place, category, status, priority, currency, project_manager, description, tags)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(refCode, 'Test Project', 'ACME', 'EMEA', 'Portugal', 'Lisbon', 'transport', 'active', 'medium', 'EUR', 'PM', 'desc', '').lastInsertRowid)
}

function makeMember(name = 'Alice') {
  return Number(db.prepare(`INSERT INTO team_members (name) VALUES (?)`).run(name).lastInsertRowid)
}

function makeTask(projectId: number, overrides: Record<string, unknown> = {}) {
  return createTask({
    projectId,
    title: (overrides.title as string) ?? 'Fix drainage',
    description: '',
    status: (overrides.status as 'todo' | 'in_progress' | 'review' | 'blocked' | 'done') ?? 'todo',
    priority: (overrides.priority as 'low' | 'medium' | 'high') ?? 'medium',
    stateSummary: '',
    dueDate: overrides.dueDate as string | undefined,
  })
}

// ── createTask ────────────────────────────────────────────────────────────────

describe('createTask', () => {
  it('creates a task and returns it with empty assignees and comments', () => {
    const pId = makeProject()
    const t = makeTask(pId)
    expect(t.id).toBeTypeOf('number')
    expect(t.projectId).toBe(pId)
    expect(t.title).toBe('Fix drainage')
    expect(t.assignees).toEqual([])
    expect(t.comments).toEqual([])
  })
})

// ── getTaskById ────────────────────────────────────────────────────────────────

describe('getTaskById', () => {
  it('returns task with assignees and comments', () => {
    const pId = makeProject()
    const t = makeTask(pId)
    const fetched = getTaskById(t.id)
    expect(fetched).not.toBeNull()
    expect(fetched!.id).toBe(t.id)
    expect(fetched!.assignees).toEqual([])
    expect(fetched!.comments).toEqual([])
  })

  it('returns null for missing id', () => {
    expect(getTaskById(9999)).toBeNull()
  })
})

// ── updateTask ────────────────────────────────────────────────────────────────

describe('updateTask', () => {
  it('updates title only', () => {
    const pId = makeProject()
    const t = makeTask(pId, { status: 'todo' })
    const updated = updateTask({ id: t.id, title: 'New Title' })
    expect(updated.title).toBe('New Title')
    expect(updated.status).toBe('todo') // unchanged
  })

  it('updates status only', () => {
    const pId = makeProject()
    const t = makeTask(pId)
    const updated = updateTask({ id: t.id, status: 'done' })
    expect(updated.status).toBe('done')
  })

  it('clears dueDate when set to null', () => {
    const pId = makeProject()
    const t = makeTask(pId, { dueDate: '2025-12-31' })
    expect(t.dueDate).toBe('2025-12-31')
    const updated = updateTask({ id: t.id, dueDate: null })
    expect(updated.dueDate).toBeNull()
  })

  it('throws Task not found for unknown id', () => {
    expect(() => updateTask({ id: 9999, title: 'X' })).toThrow('Task not found')
  })
})

// ── deleteTask ─────────────────────────────────────────────────────────────────

describe('deleteTask', () => {
  it('removes the task', () => {
    const pId = makeProject()
    const t = makeTask(pId)
    deleteTask(t.id)
    expect(getTaskById(t.id)).toBeNull()
  })

  it('cascades to task_assignments and task_comments', () => {
    const pId = makeProject()
    const mId = makeMember()
    const t = makeTask(pId)
    assignTask(t.id, mId)
    addComment(t.id, 'Author', 'Some comment')
    deleteTask(t.id)
    const assigns = (db.prepare(`SELECT * FROM task_assignments WHERE task_id = ?`).all(t.id) as unknown[]).length
    const comments = (db.prepare(`SELECT * FROM task_comments WHERE task_id = ?`).all(t.id) as unknown[]).length
    expect(assigns).toBe(0)
    expect(comments).toBe(0)
  })
})

// ── assignTask / unassignTask ─────────────────────────────────────────────────

describe('assignTask', () => {
  it('assigns a member to a task', () => {
    const pId = makeProject()
    const mId = makeMember()
    const t = makeTask(pId)
    assignTask(t.id, mId)
    const fetched = getTaskById(t.id)
    expect(fetched!.assignees).toHaveLength(1)
    expect(fetched!.assignees[0].memberId).toBe(mId)
  })

  it('double-assign is a no-op (INSERT OR IGNORE)', () => {
    const pId = makeProject()
    const mId = makeMember()
    const t = makeTask(pId)
    assignTask(t.id, mId)
    assignTask(t.id, mId)
    const fetched = getTaskById(t.id)
    expect(fetched!.assignees).toHaveLength(1)
  })
})

describe('unassignTask', () => {
  it('removes assignment', () => {
    const pId = makeProject()
    const mId = makeMember()
    const t = makeTask(pId)
    assignTask(t.id, mId)
    unassignTask(t.id, mId)
    const fetched = getTaskById(t.id)
    expect(fetched!.assignees).toHaveLength(0)
  })

  it('no-op for non-existent assignment', () => {
    const pId = makeProject()
    const t = makeTask(pId)
    expect(() => unassignTask(t.id, 9999)).not.toThrow()
  })
})

// ── addComment / deleteComment ─────────────────────────────────────────────────

describe('addComment', () => {
  it('adds comment and returns mapped comment', () => {
    const pId = makeProject()
    const t = makeTask(pId)
    const c = addComment(t.id, 'Alice', 'Looks good.')
    expect(c.taskId).toBe(t.id)
    expect(c.authorName).toBe('Alice')
    expect(c.content).toBe('Looks good.')
  })
})

describe('deleteComment', () => {
  it('removes comment leaving task intact', () => {
    const pId = makeProject()
    const t = makeTask(pId)
    const c = addComment(t.id, 'Bob', 'Comment')
    deleteComment(c.id)
    const fetched = getTaskById(t.id)
    expect(fetched!.comments).toHaveLength(0)
  })
})

// ── getTasksByProject ──────────────────────────────────────────────────────────

describe('getTasksByProject', () => {
  it('returns tasks sorted high→medium→low priority', () => {
    const pId = makeProject()
    makeTask(pId, { priority: 'low', title: 'Low' })
    makeTask(pId, { priority: 'high', title: 'High' })
    makeTask(pId, { priority: 'medium', title: 'Medium' })
    const tasks = getTasksByProject(pId)
    expect(tasks[0].priority).toBe('high')
    expect(tasks[1].priority).toBe('medium')
    expect(tasks[2].priority).toBe('low')
  })

  it('returns empty array for project with no tasks', () => {
    const pId = makeProject()
    expect(getTasksByProject(pId)).toEqual([])
  })
})

// ── getOverdue / getNearDeadline / getBlocked ──────────────────────────────────

describe('getOverdue', () => {
  it('returns tasks with due_date in past and not done', () => {
    const pId = makeProject()
    makeTask(pId, { dueDate: '2000-01-01', status: 'todo', title: 'Overdue' })
    makeTask(pId, { dueDate: '2000-01-01', status: 'done', title: 'Done old' }) // excluded
    makeTask(pId, { dueDate: '2099-12-31', status: 'todo', title: 'Future' })   // excluded
    const result = getOverdue()
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.every(t => t.dueDate! < new Date().toISOString().slice(0, 10))).toBe(true)
    expect(result.every(t => t.status !== 'done')).toBe(true)
  })
})

describe('getBlocked', () => {
  it('returns only blocked tasks', () => {
    const pId = makeProject()
    makeTask(pId, { status: 'blocked', title: 'Blocked Task' })
    makeTask(pId, { status: 'todo', title: 'Normal Task' })
    const result = getBlocked()
    expect(result.every(t => t.status === 'blocked')).toBe(true)
  })
})

describe('getNearDeadline', () => {
  it('returns tasks due within next 3 days and not done', () => {
    const pId = makeProject()
    const tomorrow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    makeTask(pId, { dueDate: tomorrow, status: 'todo', title: 'Near deadline' })
    const result = getNearDeadline()
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.every(t => t.status !== 'done')).toBe(true)
  })
})
