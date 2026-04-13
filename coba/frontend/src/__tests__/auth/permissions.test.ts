import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { CurrentUser, Role } from '../../auth/index'

// Mock the auth module so useCurrentUser is fully controlled in tests
vi.mock('../../auth/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/index')>()
  return {
    ...actual,
    useCurrentUser: vi.fn(),
  }
})

import { useCurrentUser } from '../../auth/index'
import { usePermissions } from '../../auth/permissions'

// ── helpers ───────────────────────────────────────────────────────────────────

function fakeUser(role: Role): CurrentUser {
  return { id: 1, name: 'Test User', title: 'Tester', email: 'test@test.com', role }
}

function permissionsFor(role: Role | null) {
  const user = role ? fakeUser(role) : null
  vi.mocked(useCurrentUser).mockReturnValue({
    user,
    switchUser: vi.fn(),
    signOut: vi.fn(),
  })
  const { result } = renderHook(() => usePermissions())
  return result.current
}

// ── usePermissions ────────────────────────────────────────────────────────────

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('unauthenticated (no user)', () => {
    it('returns isAuthenticated false and all flags false', () => {
      const p = permissionsFor(null)
      expect(p.isAuthenticated).toBe(false)
      expect(p.canViewProjects).toBe(false)
      expect(p.canEditProjects).toBe(false)
      expect(p.canViewFinance).toBe(false)
      expect(p.canAdminister).toBe(false)
    })
  })

  describe('user role', () => {
    it('canViewProjects is true', () => {
      expect(permissionsFor('user').canViewProjects).toBe(true)
    })

    it('canEditProjects is false', () => {
      expect(permissionsFor('user').canEditProjects).toBe(false)
    })

    it('canViewFinance is false', () => {
      expect(permissionsFor('user').canViewFinance).toBe(false)
    })

    it('canManageFinance is false', () => {
      expect(permissionsFor('user').canManageFinance).toBe(false)
    })

    it('canAdminister is false', () => {
      expect(permissionsFor('user').canAdminister).toBe(false)
    })

    it('canDeleteProjects is false', () => {
      expect(permissionsFor('user').canDeleteProjects).toBe(false)
    })
  })

  describe('manager role', () => {
    it('canEditProjects is true', () => {
      expect(permissionsFor('manager').canEditProjects).toBe(true)
    })

    it('canManageTasks is true', () => {
      expect(permissionsFor('manager').canManageTasks).toBe(true)
    })

    it('canViewFinance is false', () => {
      expect(permissionsFor('manager').canViewFinance).toBe(false)
    })

    it('canManageFinance is false', () => {
      expect(permissionsFor('manager').canManageFinance).toBe(false)
    })

    it('canAdminister is false', () => {
      expect(permissionsFor('manager').canAdminister).toBe(false)
    })

    it('canDeleteProjects is false', () => {
      expect(permissionsFor('manager').canDeleteProjects).toBe(false)
    })
  })

  describe('finance role', () => {
    it('canViewFinance is true', () => {
      expect(permissionsFor('finance').canViewFinance).toBe(true)
    })

    it('canManageFinance is true', () => {
      expect(permissionsFor('finance').canManageFinance).toBe(true)
    })

    it('canEditProjects is false', () => {
      expect(permissionsFor('finance').canEditProjects).toBe(false)
    })

    it('canDeleteProjects is false', () => {
      expect(permissionsFor('finance').canDeleteProjects).toBe(false)
    })

    it('canAdminister is false', () => {
      expect(permissionsFor('finance').canAdminister).toBe(false)
    })
  })

  describe('oversight role', () => {
    it('canDeleteProjects is true', () => {
      expect(permissionsFor('oversight').canDeleteProjects).toBe(true)
    })

    it('canViewFinance is true', () => {
      expect(permissionsFor('oversight').canViewFinance).toBe(true)
    })

    it('canManageFinance is false (oversight cannot manage finance)', () => {
      expect(permissionsFor('oversight').canManageFinance).toBe(false)
    })

    it('canAdminister is false', () => {
      expect(permissionsFor('oversight').canAdminister).toBe(false)
    })

    it('canEditProjects is true (oversight >= manager)', () => {
      expect(permissionsFor('oversight').canEditProjects).toBe(true)
    })
  })

  describe('admin role', () => {
    it('canAdminister is true', () => {
      expect(permissionsFor('admin').canAdminister).toBe(true)
    })

    it('canEditProjects is true', () => {
      expect(permissionsFor('admin').canEditProjects).toBe(true)
    })

    it('canDeleteProjects is true', () => {
      expect(permissionsFor('admin').canDeleteProjects).toBe(true)
    })

    it('canViewFinance is true', () => {
      expect(permissionsFor('admin').canViewFinance).toBe(true)
    })

    it('canManageFinance is true', () => {
      expect(permissionsFor('admin').canManageFinance).toBe(true)
    })

    it('canManageTasks is true', () => {
      expect(permissionsFor('admin').canManageTasks).toBe(true)
    })

    it('isAuthenticated is true', () => {
      expect(permissionsFor('admin').isAuthenticated).toBe(true)
    })
  })
})
