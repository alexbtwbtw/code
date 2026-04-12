import { describe, it, expect } from 'vitest'
import { CreateTaskSchema, UpdateTaskSchema, TaskStatusSchema, TaskPrioritySchema } from '../../schemas/tasks'

describe('TaskStatusSchema', () => {
  it('accepts all valid statuses', () => {
    for (const s of ['todo', 'in_progress', 'review', 'blocked', 'done']) {
      expect(() => TaskStatusSchema.parse(s)).not.toThrow()
    }
  })

  it('rejects unknown status', () => {
    expect(() => TaskStatusSchema.parse('finished')).toThrow()
  })
})

describe('TaskPrioritySchema', () => {
  it('accepts all valid priorities', () => {
    for (const p of ['low', 'medium', 'high']) {
      expect(() => TaskPrioritySchema.parse(p)).not.toThrow()
    }
  })
})

describe('CreateTaskSchema', () => {
  const minimal = { projectId: 1, title: 'Fix drainage' }

  it('requires projectId — throws without it', () => {
    expect(() => CreateTaskSchema.parse({ title: 'X' })).toThrow()
  })

  it('requires title — throws without it', () => {
    expect(() => CreateTaskSchema.parse({ projectId: 1 })).toThrow()
  })

  it('defaults status to todo', () => {
    const r = CreateTaskSchema.parse(minimal)
    expect(r.status).toBe('todo')
  })

  it('defaults priority to medium', () => {
    const r = CreateTaskSchema.parse(minimal)
    expect(r.priority).toBe('medium')
  })

  it('defaults description to empty string', () => {
    const r = CreateTaskSchema.parse(minimal)
    expect(r.description).toBe('')
  })

  it('accepts optional dueDate string', () => {
    const r = CreateTaskSchema.parse({ ...minimal, dueDate: '2025-12-31' })
    expect(r.dueDate).toBe('2025-12-31')
  })

  it('dueDate is undefined when omitted', () => {
    const r = CreateTaskSchema.parse(minimal)
    expect(r.dueDate).toBeUndefined()
  })

  it('rejects non-integer projectId', () => {
    expect(() => CreateTaskSchema.parse({ projectId: 1.5, title: 'X' })).toThrow()
  })
})

describe('UpdateTaskSchema', () => {
  it('requires id', () => {
    expect(() => UpdateTaskSchema.parse({ title: 'New title' })).toThrow()
  })

  it('accepts partial update with only title', () => {
    const r = UpdateTaskSchema.parse({ id: 1, title: 'Updated' })
    expect(r.id).toBe(1)
    expect(r.title).toBe('Updated')
    expect(r.status).toBeUndefined()
  })

  it('accepts dueDate as null for clearing', () => {
    const r = UpdateTaskSchema.parse({ id: 1, dueDate: null })
    expect(r.dueDate).toBeNull()
  })
})
