// ═══════════════════════════════════════════════════════════════════
// POST /api/auth/launchpad — Initiate Launchpad OAuth flow
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getRequestToken, storeOAuthSession, initDB } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Ensure database tables exist before storing OAuth session
    await initDB()

    const origin = request.nextUrl.origin
    const callbackUrl = `${origin}/api/auth/callback`

    // Get request token from Launchpad
    const { requestToken, requestSecret, authorizationUrl } = await getRequestToken(callbackUrl)

    // Store the OAuth session temporarily (request secret for later exchange)
    await storeOAuthSession(requestToken, requestSecret)

    return NextResponse.json({
      authorizationUrl,
      requestToken,
    })
  } catch (error) {
    console.error('Launchpad OAuth initiation failed:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Launchpad authentication' },
      { status: 500 },
    )
  }
}
