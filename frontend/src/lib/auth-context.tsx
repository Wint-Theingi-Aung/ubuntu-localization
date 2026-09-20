// ═══════════════════════════════════════════════════════════════════
// AUTH CONTEXT — Client-side authentication state
// Glossary admin uses simple password-based auth via GLOSSARY_PASSWORD
// ═══════════════════════════════════════════════════════════════════

'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

const GLOSSARY_AUTH_KEY = 'ubuntu-localization-glossary-auth'

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
  /** Authenticate as glossary admin with a password */
  glossaryLogin: (password: string) => Promise<boolean>
  /** Log out of glossary admin */
  glossaryLogout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore glossary admin session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(GLOSSARY_AUTH_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        if (data && data.password && Date.now() - (data.timestamp || 0) < 7 * 24 * 60 * 60 * 1000) {
          // Re-validate the stored password
          fetch('/api/glossary/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: data.password }),
          })
            .then(r => r.json())
            .then(d => {
              if (d.authenticated) {
                setUser({
                  id: 0,
                  username: 'glossary-admin',
                  displayName: 'Glossary Admin',
                  karma: 0,
                  avatarUrl: '',
                })
              } else {
                localStorage.removeItem(GLOSSARY_AUTH_KEY)
              }
            })
            .catch(() => localStorage.removeItem(GLOSSARY_AUTH_KEY))
            .finally(() => setLoading(false))
          return
        } else {
          localStorage.removeItem(GLOSSARY_AUTH_KEY)
        }
      }
    } catch {
      // localStorage unavailable
    }
    setLoading(false)
  }, [])

  const glossaryLogin = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/glossary/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.authenticated) {
        localStorage.setItem(GLOSSARY_AUTH_KEY, JSON.stringify({ password, timestamp: Date.now() }))
        setUser({
          id: 0,
          username: 'glossary-admin',
          displayName: 'Glossary Admin',
          karma: 0,
          avatarUrl: '',
        })
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const glossaryLogout = useCallback(() => {
    localStorage.removeItem(GLOSSARY_AUTH_KEY)
    setUser(null)
  }, [])

  // Standard auth stubs (Launchpad OAuth removed)
  const signIn = useCallback(async () => {}, [])
  const signOut = useCallback(async () => {
    glossaryLogout()
  }, [glossaryLogout])
  const refresh = useCallback(async () => {}, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refresh, glossaryLogin, glossaryLogout }}>
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
