// ═══════════════════════════════════════════════════════════════════
// AUTH CONTEXT — Client-side authentication state
// ═══════════════════════════════════════════════════════════════════

'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface AuthUser {
  id: number
  username: string
  displayName: string
  karma: number
  avatarUrl: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user || null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()

    // Check URL for auth result
    const params = new URLSearchParams(window.location.search)
    if (params.get('auth') === 'success') {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('auth') === 'error') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [fetchUser])

  const signIn = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/launchpad', { method: 'POST' })
      const data = await res.json()
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      }
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }, [])

  const refresh = useCallback(async () => {
    await fetchUser()
  }, [fetchUser])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refresh }}>
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
