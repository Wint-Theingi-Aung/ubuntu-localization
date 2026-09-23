// ═══════════════════════════════════════════════════════════════════
// /api/auth/register — User registration
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createUser, createSession, getUserByUsername, initDB } from '@/lib/db'

const SESSION_COOKIE = 'session_token'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

export async function POST(request: NextRequest) {
  try {
    await initDB()

    const body = await request.json()
    const { username, password, displayName } = body

    // Validation
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 },
      )
    }

    const cleanUsername = username.trim()
    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      return NextResponse.json(
        { error: 'Username must be 3-50 characters' },
        { status: 400 },
      )
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 },
      )
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      )
    }

    // Check if username is taken
    const existing = await getUserByUsername(cleanUsername)
    if (existing) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 },
      )
    }

    // Create user
    const user = await createUser(cleanUsername, password, displayName?.trim() || cleanUsername)

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
    }, { status: 201 })

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 },
    )
  }
}
