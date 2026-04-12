import { describe, it, expect } from 'vitest'
import { mapTask, mapComment, type RawTask, type RawComment } from '../../types/tasks'

describe('mapTask', () => {
  const raw: RawTask = {
    id: 1, project_id: 10, title: 'Fix foundation', description: 'Detailed desc',
    status: 'in_progress', priority: 'high', state_summary: 'ongoing',
    due_date: '2025-12-31', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  }

  it('maps all fields to camelCase', () => {
    const t = mapTask(raw)
    expect(t.id).toBe(1)
    expect(t.projectId).toBe(10)
    expect(t.stateSummary).toBe('ongoing')
    expect(t.dueDate).toBe('2025-12-31')
    expect(t.createdAt).toBe('2024-01-01T00:00:00Z')
    expect(t.updatedAt).toBe('2024-01-01T00:00:00Z')
  })

  it('passes through null due_date as null', () => {
    const t = mapTask({ ...raw, due_date: null })
    expect(t.dueDate).toBeNull()
  })
})

describe('mapComment', () => {
  const raw: RawComment = {
    id: 1, task_id: 5, author_name: 'Bob', content: 'Looks good.', created_at: '2024-01-01T00:00:00Z',
  }

  it('maps author_name to authorName and task_id to taskId', () => {
    const c = mapComment(raw)
    expect(c.taskId).toBe(5)
    expect(c.authorName).toBe('Bob')
    expect(c.content).toBe('Looks good.')
    expect(c.createdAt).toBe('2024-01-01T00:00:00Z')
  })
})
