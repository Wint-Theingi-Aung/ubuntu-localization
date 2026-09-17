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

    // Listen for OAuth completion message from the auth/complete page
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'launchpad-auth' && event.data?.status === 'success') {
        fetchUser()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [fetchUser])

  const signIn = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/launchpad', { method: 'POST' })
      const data = await res.json()
      if (data.authorizationUrl) {
        // Open Launchpad in a new tab so the current page stays open
        window.open(data.authorizationUrl, '_blank', 'noopener,noreferrer')
      } else {
        const msg = data.error || 'Sign-in initiation failed. Please try again.'
        console.error('Sign in failed:', msg)
        alert(msg)
      }
    } catch (error) {
      console.error('Sign in failed:', error)
      alert('Unable to connect to the server. Please try again later.')
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
