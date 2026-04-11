// D:\code\coba\frontend\src\auth\index.ts
// Auth abstraction layer — swap only the three exported function bodies for AWS/Cognito.
// Everything else (useCurrentUser hook, CurrentUser type) stays the same.

export type CurrentUser = {
  id: number
  name: string
  title: string
  email: string
  role: 'user' | 'oversight'
}

const LOCAL_STORAGE_KEY = 'coba_current_user'

function getLocalUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CurrentUser) : null
  } catch {
    return null
  }
}

// ── Public API — these three functions are the AWS swap points ───────────────

/**
 * Returns the currently active user, or null if none selected.
 * Local mode: reads from localStorage.
 * AWS mode: reads from Cognito session / JWT claim.
 */
export function getCurrentUser(): CurrentUser | null {
  return getLocalUser()
}

/**
 * Set the current user programmatically.
 * Local mode: writes to localStorage (used by the dev user switcher).
 * AWS mode: no-op — Cognito manages the session.
 */
export function setCurrentUser(user: CurrentUser): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user))
}

/**
 * Sign out.
 * Local mode: clears localStorage.
 * AWS mode: calls Cognito signOut().
 */
export function signOut(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY)
}

// ── React hook ───────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(getCurrentUser)

  useEffect(() => {
    // Re-sync if another tab changes localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY) {
        setUser(getCurrentUser())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const switchUser = (next: CurrentUser) => {
    setCurrentUser(next)
    setUser(next)
  }

  return { user, switchUser, signOut }
}
