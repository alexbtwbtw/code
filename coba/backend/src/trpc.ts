import { initTRPC, TRPCError } from '@trpc/server'

// ── Context ────────────────────────────────────────────────────────────────────

export type AppContext = {
  userRole: string | null
}

const t = initTRPC.context<AppContext>().create()

export const router = t.router
export const publicProcedure = t.procedure

// ── Finance procedure ──────────────────────────────────────────────────────────
// TODO: This is a placeholder pending real auth implementation (e.g. Cognito JWT).
// Currently reads the user role from the `x-user-role` HTTP header sent by the
// frontend. Replace with verified JWT claims when real auth is wired up.

export const financeProcedure = t.procedure.use(({ ctx, next }) => {
  const role = ctx.userRole
  if (role !== 'finance' && role !== 'oversight') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Access restricted to Finance and Oversight users',
    })
  }
  return next({ ctx })
})
