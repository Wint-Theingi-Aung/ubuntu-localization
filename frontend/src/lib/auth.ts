// ═══════════════════════════════════════════════════════════════════
// AUTH — Server-side session validation
// ═══════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server'
import { getSessionUser, type DbSessionUser } from './db'

const SESSION_COOKIE = 'session_token'

/**
 * Extract and validate the current user from a request's session cookie.
 * Returns null if not authenticated.
 */
export async function getAuthUser(request: NextRequest): Promise<DbSessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    return await getSessionUser(token)
  } catch {
    return null
  }
}
