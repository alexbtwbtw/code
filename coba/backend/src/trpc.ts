import { initTRPC, TRPCError } from '@trpc/server'

// ── Context ────────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'oversight' | 'manager' | 'finance' | 'user'

export type AppContext = {
  userRole: Role | null
  userId:   string | null
  userName: string | null
}

const ROLE_WEIGHT: Record<Role, number> = {
  admin: 50, oversight: 40, manager: 30, finance: 20, user: 10,
}

function atLeast(ctx: AppContext, minRole: Role): boolean {
  if (!ctx.userRole) return false
  return (ROLE_WEIGHT[ctx.userRole] ?? 0) >= ROLE_WEIGHT[minRole]
}

const t = initTRPC.context<AppContext>().create()

export const router = t.router

// ── No auth required ──────────────────────────────────────────────────────────
export const publicProcedure = t.procedure

// ── Any authenticated user ────────────────────────────────────────────────────
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userRole) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' })
  }
  return next({ ctx: { ...ctx, userRole: ctx.userRole } })
})

// ── Manager or above (manager | oversight | admin) ────────────────────────────
export const managerProcedure = authedProcedure.use(({ ctx, next }) => {
  if (!atLeast(ctx, 'manager')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Manager access required' })
  }
  return next({ ctx })
})

// ── Finance or above (finance | oversight | admin) ────────────────────────────
// Finance is a parallel lane — uses allowlist rather than rank comparison
export const financeProcedure = authedProcedure.use(({ ctx, next }) => {
  const allowed: Role[] = ['finance', 'oversight', 'admin']
  if (!ctx.userRole || !allowed.includes(ctx.userRole)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Finance access required' })
  }
  return next({ ctx })
})

// ── Oversight or admin ────────────────────────────────────────────────────────
export const oversightProcedure = authedProcedure.use(({ ctx, next }) => {
  if (!atLeast(ctx, 'oversight')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Oversight access required' })
  }
  return next({ ctx })
})

// ── Admin only ────────────────────────────────────────────────────────────────
export const adminProcedure = authedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' })
  }
  return next({ ctx })
})

// Re-export atLeast for use inside router procedures that need ownership checks
export { atLeast }
