import { router } from '../trpc'
import { insurersRouter } from './insurers'
import { claimsRouter } from './claims'
import { documentsRouter } from './documents'
import { inspectionsRouter } from './inspections'
import { lineItemsRouter } from './lineItems'
import { billingRouter } from './billing'
import { invoicesRouter } from './invoices'

export const appRouter = router({
  insurers: insurersRouter,
  claims: claimsRouter,
  documents: documentsRouter,
  inspections: inspectionsRouter,
  lineItems: lineItemsRouter,
  billing: billingRouter,
  invoices: invoicesRouter,
})

export type AppRouter = typeof appRouter
