import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trpc } from '../trpc'
import { useCurrentUser } from '../auth'
import type { CurrentUser, Role } from '../auth'
import { useTranslation } from '../i18n/context'

const ALL_ROLES: Role[] = ['admin', 'oversight', 'manager', 'finance', 'user']

function normaliseRole(raw: string): Role {
  return ALL_ROLES.includes(raw as Role) ? (raw as Role) : 'user'
}

export default function UserSwitcher() {
  const { t } = useTranslation()
  const { user, switchUser } = useCurrentUser()
  const [open, setOpen] = useState(false)

  const { data: members } = useQuery(trpc.team.list.queryOptions())

  // Auto-select first member on first load if no user in localStorage
  useEffect(() => {
    if (!user && members && members.length > 0) {
      const first = members[0]
      const next: CurrentUser = {
        id: first.id,
        name: first.name,
        title: first.title,
        email: first.email,
        role: normaliseRole(first.role),
      }
      switchUser(next)
    }
  }, [members, user, switchUser])

  function getInitials(name: string) {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  }

  function roleBadgeLabel(role: Role): string {
    if (role === 'oversight') return t('userRoleOversight')
    if (role === 'finance')   return t('roleFinance')
    if (role === 'manager')   return 'manager'
    if (role === 'admin')     return 'admin'
    return t('userRoleUser')
  }

  function handleSelect(member: NonNullable<typeof members>[number]) {
    const next: CurrentUser = {
      id: member.id,
      name: member.name,
      title: member.title,
      email: member.email,
      role: normaliseRole(member.role),
    }
    switchUser(next)
    setOpen(false)
    window.location.reload()
  }

  return (
    <div className="user-switcher">
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setOpen(false)}
        />
      )}
      <button
        className="user-avatar-btn"
        onClick={() => setOpen(o => !o)}
        title={t('userSwitcherLabel')}
      >
        <span className="user-avatar-initials">{user ? getInitials(user.name) : '?'}</span>
        <span className="user-avatar-role">{user ? user.role : '—'}</span>
      </button>

      {open && (
        <div className="user-switcher-dropdown">
          <p className="user-switcher-label">{t('userSwitcherLabel')}</p>
          <div className="user-switcher-scroll">
            {(members ?? []).map(member => {
              const role = normaliseRole(member.role)
              const isActive = user?.id === member.id
              return (
                <button
                  key={member.id}
                  className={`user-switcher-item${isActive ? ' user-switcher-item--active' : ''}`}
                  onClick={() => handleSelect(member)}
                >
                  <span className="user-switcher-name">{member.name}</span>
                  <span className={`user-switcher-role-badge user-switcher-role-badge--${role}`}>
                    {roleBadgeLabel(role)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
