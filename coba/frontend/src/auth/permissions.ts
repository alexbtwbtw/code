import { useCurrentUser } from './index'
import type { Role } from './index'

const ROLE_WEIGHT: Record<Role, number> = {
  admin: 50, oversight: 40, manager: 30, finance: 20, user: 10,
}

function atLeast(role: Role | undefined, min: Role): boolean {
  if (!role) return false
  return (ROLE_WEIGHT[role] ?? 0) >= ROLE_WEIGHT[min]
}

export function usePermissions() {
  const { user } = useCurrentUser()
  const role = user?.role

  return {
    // --- Identity
    isAuthenticated: !!user,
    role,
    isAdmin:     role === 'admin',
    isOversight: role === 'oversight',
    isManager:   role === 'manager',
    isFinance:   role === 'finance',

    // --- Projects
    canViewProjects:   !!role,
    canEditProjects:   atLeast(role, 'manager'),
    canDeleteProjects: atLeast(role, 'oversight'),
    canManageTeam:     atLeast(role, 'manager'),
    canDeleteMembers:  atLeast(role, 'oversight'),

    // --- Tasks
    canManageTasks: atLeast(role, 'manager'),

    // --- Finance
    canViewFinance:   role === 'finance' || atLeast(role, 'oversight'),
    canManageFinance: role === 'finance' || role === 'admin',

    // --- Reports
    canViewReports:          !!role,
    canViewPortfolioReports: atLeast(role, 'manager'),

    // --- Admin
    canAdminister: role === 'admin',
  } as const
}

export type Permissions = ReturnType<typeof usePermissions>
