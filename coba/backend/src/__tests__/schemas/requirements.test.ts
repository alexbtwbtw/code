import { describe, it, expect } from 'vitest'
import { BookInputSchema, RequirementInputSchema } from '../../schemas/requirements'

describe('BookInputSchema', () => {
  it('requires title', () => {
    expect(() => BookInputSchema.parse({ category: 'transport' })).toThrow()
  })

  it('defaults category to other', () => {
    const b = BookInputSchema.parse({ title: 'My Book' })
    expect(b.category).toBe('other')
  })

  it('defaults description to empty string', () => {
    const b = BookInputSchema.parse({ title: 'My Book' })
    expect(b.description).toBe('')
  })

  it('accepts nullable projectId', () => {
    const b = BookInputSchema.parse({ title: 'My Book', projectId: null })
    expect(b.projectId).toBeNull()
  })

  it('accepts numeric projectId', () => {
    const b = BookInputSchema.parse({ title: 'My Book', projectId: 5 })
    expect(b.projectId).toBe(5)
  })
})

describe('RequirementInputSchema', () => {
  const minimal = { bookId: 1, title: 'Senior Geotech' }

  it('requires bookId and title', () => {
    expect(() => RequirementInputSchema.parse({ title: 'X' })).toThrow()
    expect(() => RequirementInputSchema.parse({ bookId: 1 })).toThrow()
  })

  it('defaults discipline to other', () => {
    const r = RequirementInputSchema.parse(minimal)
    expect(r.discipline).toBe('other')
  })

  it('defaults level to any', () => {
    const r = RequirementInputSchema.parse(minimal)
    expect(r.level).toBe('any')
  })

  it('accepts yearsExperience as null', () => {
    const r = RequirementInputSchema.parse({ ...minimal, yearsExperience: null })
    expect(r.yearsExperience).toBeNull()
  })

  it('accepts numeric yearsExperience', () => {
    const r = RequirementInputSchema.parse({ ...minimal, yearsExperience: 10 })
    expect(r.yearsExperience).toBe(10)
  })

  it('rejects invalid discipline', () => {
    expect(() => RequirementInputSchema.parse({ ...minimal, discipline: 'unknown' })).toThrow()
  })

  it('rejects invalid level', () => {
    expect(() => RequirementInputSchema.parse({ ...minimal, level: 'expert' })).toThrow()
  })
})
