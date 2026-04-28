import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { createInvoiceSchema, updateInvoiceStatusSchema } from '../schemas/invoices'
import {
  getInvoicesByClaimId,
  getInvoiceItems,
  getInvoiceIdsForLineItem,
  getInvoiceIdsForBillingItem,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} from '../services/invoices'

export const invoicesRouter = router({
  list: publicProcedure
    .input(z.object({ claimId: z.number().int().positive() }))
    .query(({ input }) => getInvoicesByClaimId(input.claimId)),

  getItems: publicProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(({ input }) => getInvoiceItems(input.invoiceId)),

  lineItemInvoices: publicProcedure
    .input(z.object({ lineItemId: z.number().int().positive() }))
    .query(({ input }) => getInvoiceIdsForLineItem(input.lineItemId)),

  billingItemInvoices: publicProcedure
    .input(z.object({ billingItemId: z.number().int().positive() }))
    .query(({ input }) => getInvoiceIdsForBillingItem(input.billingItemId)),

  create: publicProcedure
    .input(createInvoiceSchema)
    .mutation(({ input }) => createInvoice(input)),

  updateStatus: publicProcedure
    .input(updateInvoiceStatusSchema)
    .mutation(({ input }) => updateInvoiceStatus(input.id, input.status)),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => deleteInvoice(input.id)),
})
