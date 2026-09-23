// ═══════════════════════════════════════════════════════════════════
// /api/auth/login — User login
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getUserByUsername, createSession, verifyPassword, initDB } from '@/lib/db'

const SESSION_COOKIE = 'session_token'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

export async function POST(request: NextRequest) {
  try {
    await initDB()

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 },
      )
    }

    // Find user
    const user = await getUserByUsername(username.trim())
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 },
      )
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 },
      )
    }

    // Create session
    const token = await createSession(user.id)

    // Set cookie and return user
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
      },
    })

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 },
    )
  }
}
