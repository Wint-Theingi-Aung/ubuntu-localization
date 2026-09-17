// ═══════════════════════════════════════════════════════════════════
// POST /api/auth/logout — Clear session and log out
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { deleteSession, getSessionToken, clearSessionCookie, initDB } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const cookies = request.headers.get('cookie')
    const token = getSessionToken(cookies)

    if (token) {
      await deleteSession(token)
    }

    const response = NextResponse.json({ success: true })
    response.headers.append('Set-Cookie', clearSessionCookie())

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: true })
  }
}
