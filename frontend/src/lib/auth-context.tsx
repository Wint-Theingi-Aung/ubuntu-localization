// ═══════════════════════════════════════════════════════════════════
// AUTH CONTEXT — Client-side authentication state
// Uses session cookies for secure authentication
// ═══════════════════════════════════════════════════════════════════

'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface AuthUser {
  id: number
  username: string
  displayName: string
  isAdmin: boolean
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  /** Register a new account */
  register: (username: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>
  /** Login with username and password */
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  /** Logout current user */
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore session from cookie on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          setUser(d.user)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const register = useCallback(async (username: string, password: string, displayName?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, displayName }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        setUser(data.user)
        return { success: true }
      }
      return { success: false, error: data.error || 'Registration failed' }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        setUser(data.user)
        return { success: true }
      }
      return { success: false, error: data.error || 'Login failed' }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {}
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export type { AuthUser }
