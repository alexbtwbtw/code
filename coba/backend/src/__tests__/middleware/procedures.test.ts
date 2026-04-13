import { describe, it, expect } from 'vitest'
import { TRPCError } from '@trpc/server'
import {
  router,
  authedProcedure,
  managerProcedure,
  financeProcedure,
  oversightProcedure,
  adminProcedure,
  type AppContext,
} from '../../trpc'

// ── Minimal test router ───────────────────────────────────────────────────────

const testRouter = router({
  authed:    authedProcedure.query(() => 'ok-authed'),
  manager:   managerProcedure.query(() => 'ok-manager'),
  finance:   financeProcedure.query(() => 'ok-finance'),
  oversight: oversightProcedure.query(() => 'ok-oversight'),
  admin:     adminProcedure.query(() => 'ok-admin'),
})

function makeCaller(ctx: AppContext) {
  return testRouter.createCaller(ctx)
}

// ── authedProcedure ───────────────────────────────────────────────────────────

describe('authedProcedure', () => {
  it('throws UNAUTHORIZED when no x-user-role header (null role)', async () => {
    const caller = makeCaller({ userRole: null, userId: null, userName: null })
    await expect(caller.authed()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })

  it('allows any valid role', async () => {
    for (const role of ['user', 'manager', 'finance', 'oversight', 'admin'] as const) {
      const caller = makeCaller({ userRole: role, userId: '1', userName: 'Test' })
      await expect(caller.authed()).resolves.toBe('ok-authed')
    }
  })
})

// ── managerProcedure ──────────────────────────────────────────────────────────

describe('managerProcedure', () => {
  it('throws FORBIDDEN when role is "user"', async () => {
    const caller = makeCaller({ userRole: 'user', userId: '1', userName: 'Test' })
    await expect(caller.manager()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws FORBIDDEN when role is "finance"', async () => {
    const caller = makeCaller({ userRole: 'finance', userId: '1', userName: 'Test' })
    await expect(caller.manager()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('allows "manager" role', async () => {
    const caller = makeCaller({ userRole: 'manager', userId: '1', userName: 'Test' })
    await expect(caller.manager()).resolves.toBe('ok-manager')
  })

  it('allows "oversight" role', async () => {
    const caller = makeCaller({ userRole: 'oversight', userId: '1', userName: 'Test' })
    await expect(caller.manager()).resolves.toBe('ok-manager')
  })

  it('allows "admin" role', async () => {
    const caller = makeCaller({ userRole: 'admin', userId: '1', userName: 'Test' })
    await expect(caller.manager()).resolves.toBe('ok-manager')
  })
})

// ── financeProcedure ──────────────────────────────────────────────────────────

describe('financeProcedure', () => {
  it('throws FORBIDDEN for "user" role', async () => {
    const caller = makeCaller({ userRole: 'user', userId: '1', userName: 'Test' })
    await expect(caller.finance()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws FORBIDDEN for "manager" role', async () => {
    const caller = makeCaller({ userRole: 'manager', userId: '1', userName: 'Test' })
    await expect(caller.finance()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('allows "finance" role', async () => {
    const caller = makeCaller({ userRole: 'finance', userId: '1', userName: 'Test' })
    await expect(caller.finance()).resolves.toBe('ok-finance')
  })

  it('allows "oversight" role', async () => {
    const caller = makeCaller({ userRole: 'oversight', userId: '1', userName: 'Test' })
    await expect(caller.finance()).resolves.toBe('ok-finance')
  })

  it('allows "admin" role', async () => {
    const caller = makeCaller({ userRole: 'admin', userId: '1', userName: 'Test' })
    await expect(caller.finance()).resolves.toBe('ok-finance')
  })
})

// ── oversightProcedure ────────────────────────────────────────────────────────

describe('oversightProcedure', () => {
  it('throws FORBIDDEN for "user" role', async () => {
    const caller = makeCaller({ userRole: 'user', userId: '1', userName: 'Test' })
    await expect(caller.oversight()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws FORBIDDEN for "manager" role', async () => {
    const caller = makeCaller({ userRole: 'manager', userId: '1', userName: 'Test' })
    await expect(caller.oversight()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws FORBIDDEN for "finance" role', async () => {
    const caller = makeCaller({ userRole: 'finance', userId: '1', userName: 'Test' })
    await expect(caller.oversight()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('allows "oversight" role', async () => {
    const caller = makeCaller({ userRole: 'oversight', userId: '1', userName: 'Test' })
    await expect(caller.oversight()).resolves.toBe('ok-oversight')
  })

  it('allows "admin" role', async () => {
    const caller = makeCaller({ userRole: 'admin', userId: '1', userName: 'Test' })
    await expect(caller.oversight()).resolves.toBe('ok-oversight')
  })
})

// ── adminProcedure ────────────────────────────────────────────────────────────

describe('adminProcedure', () => {
  it('throws FORBIDDEN for "user" role', async () => {
    const caller = makeCaller({ userRole: 'user', userId: '1', userName: 'Test' })
    await expect(caller.admin()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws FORBIDDEN for "manager" role', async () => {
    const caller = makeCaller({ userRole: 'manager', userId: '1', userName: 'Test' })
    await expect(caller.admin()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws FORBIDDEN for "finance" role', async () => {
    const caller = makeCaller({ userRole: 'finance', userId: '1', userName: 'Test' })
    await expect(caller.admin()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws FORBIDDEN for "oversight" role', async () => {
    const caller = makeCaller({ userRole: 'oversight', userId: '1', userName: 'Test' })
    await expect(caller.admin()).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('allows only "admin" role', async () => {
    const caller = makeCaller({ userRole: 'admin', userId: '1', userName: 'Test' })
    await expect(caller.admin()).resolves.toBe('ok-admin')
  })
})
