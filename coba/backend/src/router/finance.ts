import { z } from 'zod'
import { router, financeProcedure } from '../trpc'
import * as financeService from '../services/finance'

// All finance procedures require role = 'finance' or 'oversight'.
// The financeProcedure middleware enforces this check server-side.

const FixedCostCategoryEnum = z.enum([
  'materials', 'subcontractor', 'equipment',
  'travel', 'permits', 'survey', 'software', 'other',
])

export const financeRouter = router({

  // ── Member rates ────────────────────────────────────────────────────────────

  getMemberRates: financeProcedure
    .input(z.object({ memberId: z.number().int() }))
    .query(({ input }) => financeService.getMemberRates(input.memberId)),

  getMemberCurrentRate: financeProcedure
    .input(z.object({ memberId: z.number().int(), asOfDate: z.string().optional() }))
    .query(({ input }) => financeService.getCurrentRate(input.memberId, input.asOfDate)),

  setMemberRate: financeProcedure
    .input(z.object({
      memberId:      z.number().int(),
      hourlyRate:    z.number().nonnegative(),
      effectiveFrom: z.string().min(1),
      notes:         z.string().default(''),
    }))
    .mutation(({ input }) => financeService.setMemberRate(
      input.memberId,
      input.hourlyRate,
      input.effectiveFrom,
      input.notes,
    )),

  deleteMemberRate: financeProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => financeService.deleteMemberRate(input.id)),

  // ── Project fixed costs ──────────────────────────────────────────────────────

  getProjectFixedCosts: financeProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => financeService.getFixedCostsByProject(input.projectId)),

  createFixedCost: financeProcedure
    .input(z.object({
      projectId:   z.number().int(),
      description: z.string().min(1),
      amount:      z.number().nonnegative(),
      costDate:    z.string().min(1),
      category:    FixedCostCategoryEnum.default('other'),
      notes:       z.string().default(''),
    }))
    .mutation(({ input }) => financeService.createFixedCost({
      projectId:   input.projectId,
      description: input.description,
      amount:      input.amount,
      costDate:    input.costDate,
      category:    input.category,
      notes:       input.notes,
    })),

  updateFixedCost: financeProcedure
    .input(z.object({
      id:          z.number().int(),
      description: z.string().min(1).optional(),
      amount:      z.number().nonnegative().optional(),
      costDate:    z.string().optional(),
      category:    FixedCostCategoryEnum.optional(),
      notes:       z.string().optional(),
    }))
    .mutation(({ input }) => financeService.updateFixedCost(input)),

  deleteFixedCost: financeProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ input }) => financeService.deleteFixedCost(input.id)),

  // ── Aggregated summaries ─────────────────────────────────────────────────────

  projectFinancialSummary: financeProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ input }) => financeService.getProjectFinancialSummary(input.projectId)),

  memberCostSummary: financeProcedure
    .input(z.object({ memberId: z.number().int() }))
    .query(({ input }) => financeService.getMemberCostSummary(input.memberId)),

  companyFinancials: financeProcedure
    .input(z.object({
      fromDate: z.string().optional(),
      toDate:   z.string().optional(),
    }).optional())
    .query(({ input }) => financeService.getCompanyFinancials(input ?? {})),
})
