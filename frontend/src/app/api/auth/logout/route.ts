// ═══════════════════════════════════════════════════════════════════
// /api/auth/logout — User logout
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { deleteSession, initDB } from '@/lib/db'

const SESSION_COOKIE = 'session_token'

export async function POST(request: NextRequest) {
  try {
    await initDB()

    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (token) {
      await deleteSession(token)
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 },
    )
  }
}
