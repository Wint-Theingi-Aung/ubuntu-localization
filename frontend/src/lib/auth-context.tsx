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
  const [loading] = useState(false)

  const signIn = useCallback(async () => {}, [])
  const signOut = useCallback(async () => {}, [])
  const refresh = useCallback(async () => {}, [])

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
