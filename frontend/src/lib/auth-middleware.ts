// ═══════════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — Helper for protecting API routes
// ═══════════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server'
import { getCurrentUser, type DbUser } from './auth'

export interface AuthenticatedRequest extends NextRequest {
  user: DbUser
}

/**
 * Require authentication for an API route handler.
 * Returns the authenticated user or throws a 401 JSON error.
 *
 * Usage in route handlers:
 *   const user = await requireAuth(request)
 */
export async function requireAuth(request: NextRequest): Promise<DbUser> {
  const cookies = request.headers.get('cookie')
  const user = await getCurrentUser(cookies)

  if (!user) {
    throw new AuthError('Authentication required')
  }

  return user
}

/**
 * Optional authentication — returns user or null
 */
export async function optionalAuth(request: NextRequest): Promise<DbUser | null> {
  const cookies = request.headers.get('cookie')
  return getCurrentUser(cookies)
}

/**
 * Custom error class for auth failures in route handlers
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Check if a user has permission to perform an action.
 * Currently all authenticated users can do all authenticated actions.
 */
export function hasPermission(_user: DbUser, _action: string): boolean {
  // All authenticated users have full access to authenticated features
  return true
}
