import { describe, it, expect } from 'vitest'
import { CreateProjectSchema, ProjectStatusSchema, ProjectCategorySchema, ProjectPrioritySchema } from '../../schemas/projects'

describe('ProjectStatusSchema', () => {
  it('accepts all valid statuses', () => {
    for (const s of ['planning', 'active', 'completed', 'suspended', 'cancelled']) {
      expect(() => ProjectStatusSchema.parse(s)).not.toThrow()
    }
  })

  it('rejects unknown status', () => {
    expect(() => ProjectStatusSchema.parse('unknown')).toThrow()
  })
})

describe('ProjectCategorySchema', () => {
  it('accepts all valid categories', () => {
    for (const c of ['water', 'transport', 'energy', 'environment', 'planning', 'other']) {
      expect(() => ProjectCategorySchema.parse(c)).not.toThrow()
    }
  })

  it('rejects invalid category', () => {
    expect(() => ProjectCategorySchema.parse('construction')).toThrow()
  })
})

describe('ProjectPrioritySchema', () => {
  it('accepts all valid priorities', () => {
    for (const p of ['critical', 'very_high', 'high', 'medium', 'low', 'very_low', 'minimal']) {
      expect(() => ProjectPrioritySchema.parse(p)).not.toThrow()
    }
  })
})

describe('CreateProjectSchema', () => {
  const minimal = { refCode: 'P-001', name: 'Test Project' }

  it('requires refCode — throws without it', () => {
    expect(() => CreateProjectSchema.parse({ name: 'X' })).toThrow()
  })

  it('requires name — throws without it', () => {
    expect(() => CreateProjectSchema.parse({ refCode: 'P-001' })).toThrow()
  })

  it('defaults status to planning', () => {
    const r = CreateProjectSchema.parse(minimal)
    expect(r.status).toBe('planning')
  })

  it('defaults category to other', () => {
    const r = CreateProjectSchema.parse(minimal)
    expect(r.category).toBe('other')
  })

  it('defaults priority to medium', () => {
    const r = CreateProjectSchema.parse(minimal)
    expect(r.priority).toBe('medium')
  })

  it('defaults currency to EUR', () => {
    const r = CreateProjectSchema.parse(minimal)
    expect(r.currency).toBe('EUR')
  })

  it('defaults teamSize to 0', () => {
    const r = CreateProjectSchema.parse(minimal)
    expect(r.teamSize).toBe(0)
  })

  it('rejects invalid category enum', () => {
    expect(() => CreateProjectSchema.parse({ ...minimal, category: 'invalid' })).toThrow()
  })

  it('rejects invalid status enum', () => {
    expect(() => CreateProjectSchema.parse({ ...minimal, status: 'archived' })).toThrow()
  })

  it('accepts optional budget as number', () => {
    const r = CreateProjectSchema.parse({ ...minimal, budget: 500000 })
    expect(r.budget).toBe(500000)
  })

  it('accepts optional startDate string', () => {
    const r = CreateProjectSchema.parse({ ...minimal, startDate: '2024-01-01' })
    expect(r.startDate).toBe('2024-01-01')
  })

  it('startDate and endDate are undefined when omitted', () => {
    const r = CreateProjectSchema.parse(minimal)
    expect(r.startDate).toBeUndefined()
    expect(r.endDate).toBeUndefined()
  })
})
