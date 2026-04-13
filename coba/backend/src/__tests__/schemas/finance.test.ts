import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// These schemas mirror the inline Zod definitions in backend/src/router/finance.ts
// The finance router does not have a dedicated schemas/finance.ts file, so we
// replicate the schemas here to keep the tests self-contained.

const FixedCostCategoryEnum = z.enum([
  'materials', 'subcontractor', 'equipment',
  'travel', 'permits', 'survey', 'software', 'other',
])

const SetMemberRateSchema = z.object({
  memberId:      z.number().int(),
  hourlyRate:    z.number().nonnegative(),
  effectiveFrom: z.string().min(1),
  notes:         z.string().default(''),
})

const CreateFixedCostSchema = z.object({
  projectId:   z.number().int(),
  description: z.string().min(1),
  amount:      z.number().nonnegative(),
  costDate:    z.string().min(1),
  category:    FixedCostCategoryEnum.default('other'),
  notes:       z.string().default(''),
})

const UpdateFixedCostSchema = z.object({
  id:          z.number().int(),
  description: z.string().min(1).optional(),
  amount:      z.number().nonnegative().optional(),
  costDate:    z.string().optional(),
  category:    FixedCostCategoryEnum.optional(),
  notes:       z.string().optional(),
})

// ── FixedCostCategoryEnum ─────────────────────────────────────────────────────

describe('FixedCostCategoryEnum', () => {
  it('accepts all valid categories', () => {
    const valid = ['materials', 'subcontractor', 'equipment', 'travel', 'permits', 'survey', 'software', 'other']
    for (const cat of valid) {
      expect(() => FixedCostCategoryEnum.parse(cat)).not.toThrow()
    }
  })

  it('rejects an unknown category string', () => {
    expect(() => FixedCostCategoryEnum.parse('furniture')).toThrow()
    expect(() => FixedCostCategoryEnum.parse('')).toThrow()
    expect(() => FixedCostCategoryEnum.parse('MATERIALS')).toThrow()
  })
})

// ── SetMemberRateSchema ───────────────────────────────────────────────────────

describe('SetMemberRateSchema — required fields', () => {
  const valid = {
    memberId: 1,
    hourlyRate: 75.0,
    effectiveFrom: '2025-01-01',
    notes: '',
  }

  it('accepts a fully valid payload', () => {
    expect(() => SetMemberRateSchema.parse(valid)).not.toThrow()
  })

  it('requires memberId — throws without it', () => {
    const { memberId: _m, ...rest } = valid
    expect(() => SetMemberRateSchema.parse(rest)).toThrow()
  })

  it('requires hourlyRate — throws without it', () => {
    const { hourlyRate: _r, ...rest } = valid
    expect(() => SetMemberRateSchema.parse(rest)).toThrow()
  })

  it('requires effectiveFrom to be a non-empty string — throws for empty string', () => {
    expect(() => SetMemberRateSchema.parse({ ...valid, effectiveFrom: '' })).toThrow()
  })

  it('rejects a negative hourlyRate', () => {
    expect(() => SetMemberRateSchema.parse({ ...valid, hourlyRate: -1 })).toThrow()
  })

  it('accepts hourlyRate of 0 (free/volunteer)', () => {
    expect(() => SetMemberRateSchema.parse({ ...valid, hourlyRate: 0 })).not.toThrow()
  })

  it('defaults notes to empty string when omitted', () => {
    const { notes: _n, ...rest } = valid
    const result = SetMemberRateSchema.parse(rest)
    expect(result.notes).toBe('')
  })

  it('rejects non-integer memberId', () => {
    expect(() => SetMemberRateSchema.parse({ ...valid, memberId: 1.5 })).toThrow()
  })
})

// ── CreateFixedCostSchema ─────────────────────────────────────────────────────

describe('CreateFixedCostSchema — required fields', () => {
  const valid = {
    projectId: 1,
    description: 'Site survey costs',
    amount: 2500.0,
    costDate: '2025-04-01',
    category: 'survey' as const,
    notes: '',
  }

  it('accepts a fully valid payload', () => {
    expect(() => CreateFixedCostSchema.parse(valid)).not.toThrow()
  })

  it('requires projectId — throws without it', () => {
    const { projectId: _p, ...rest } = valid
    expect(() => CreateFixedCostSchema.parse(rest)).toThrow()
  })

  it('requires description to be a non-empty string — throws for empty string', () => {
    expect(() => CreateFixedCostSchema.parse({ ...valid, description: '' })).toThrow()
  })

  it('requires amount — throws without it', () => {
    const { amount: _a, ...rest } = valid
    expect(() => CreateFixedCostSchema.parse(rest)).toThrow()
  })

  it('rejects a negative amount', () => {
    expect(() => CreateFixedCostSchema.parse({ ...valid, amount: -100 })).toThrow()
  })

  it('accepts amount of 0', () => {
    expect(() => CreateFixedCostSchema.parse({ ...valid, amount: 0 })).not.toThrow()
  })

  it('requires costDate to be a non-empty string — throws for empty string', () => {
    expect(() => CreateFixedCostSchema.parse({ ...valid, costDate: '' })).toThrow()
  })

  it('defaults category to "other" when omitted', () => {
    const { category: _c, ...rest } = valid
    const result = CreateFixedCostSchema.parse(rest)
    expect(result.category).toBe('other')
  })

  it('defaults notes to empty string when omitted', () => {
    const { notes: _n, ...rest } = valid
    const result = CreateFixedCostSchema.parse(rest)
    expect(result.notes).toBe('')
  })

  it('rejects an invalid category', () => {
    expect(() => CreateFixedCostSchema.parse({ ...valid, category: 'furniture' })).toThrow()
  })
})

// ── UpdateFixedCostSchema ─────────────────────────────────────────────────────

describe('UpdateFixedCostSchema', () => {
  it('accepts payload with only id (all updates optional)', () => {
    expect(() => UpdateFixedCostSchema.parse({ id: 42 })).not.toThrow()
  })

  it('requires id — throws without it', () => {
    expect(() => UpdateFixedCostSchema.parse({ amount: 100 })).toThrow()
  })

  it('accepts partial updates', () => {
    const result = UpdateFixedCostSchema.parse({ id: 1, amount: 999 })
    expect(result.amount).toBe(999)
    expect(result.description).toBeUndefined()
  })

  it('rejects invalid category in update', () => {
    expect(() => UpdateFixedCostSchema.parse({ id: 1, category: 'unknown' })).toThrow()
  })

  it('rejects negative amount in update', () => {
    expect(() => UpdateFixedCostSchema.parse({ id: 1, amount: -50 })).toThrow()
  })
})
