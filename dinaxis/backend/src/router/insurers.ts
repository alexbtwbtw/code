import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { createInsurerSchema, updateInsurerSchema, createInsurerContactSchema, updateInsurerContactSchema } from '../schemas/insurers'
import {
  listInsurers,
  getInsurerById,
  createInsurer,
  updateInsurer,
  deleteInsurer,
  getInsurerClaimCount,
  getContactsByInsurerId,
  addInsurerContact,
  updateInsurerContact,
  deleteInsurerContact,
  setPrimaryContact,
} from '../services/insurers'

export const insurersRouter = router({
  list: publicProcedure.query(() => listInsurers()),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => getInsurerById(input.id)),

  create: publicProcedure
    .input(createInsurerSchema)
    .mutation(({ input }) => createInsurer(input)),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive() }).merge(updateInsurerSchema))
    .mutation(({ input }) => {
      const { id, ...rest } = input
      return updateInsurer(id, rest)
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteInsurer(input.id)),

  claimCount: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(({ input }) => ({ count: getInsurerClaimCount(input.id) })),

  contacts: publicProcedure
    .input(z.object({ insurerId: z.number().int().positive() }))
    .query(({ input }) => getContactsByInsurerId(input.insurerId)),

  addContact: publicProcedure
    .input(createInsurerContactSchema)
    .mutation(({ input }) => addInsurerContact(input)),

  updateContact: publicProcedure
    .input(z.object({ id: z.number().int().positive() }).merge(updateInsurerContactSchema))
    .mutation(({ input }) => {
      const { id, ...rest } = input
      return updateInsurerContact(id, rest)
    }),

  deleteContact: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ input }) => deleteInsurerContact(input.id)),

  setPrimary: publicProcedure
    .input(z.object({ insurerId: z.number().int().positive(), contactId: z.number().int().positive() }))
    .mutation(({ input }) => {
      setPrimaryContact(input.insurerId, input.contactId)
      return { ok: true as const }
    }),
})
