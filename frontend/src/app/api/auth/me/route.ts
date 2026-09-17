// ═══════════════════════════════════════════════════════════════════
// GET /api/auth/me — Get current authenticated user
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, initDB } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const cookies = request.headers.get('cookie')
    const user = await getCurrentUser(cookies)

    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        karma: user.karma,
        avatarUrl: user.avatar_url,
      },
    })
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json({ user: null })
  }
}
