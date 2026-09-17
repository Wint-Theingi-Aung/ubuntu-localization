// ═══════════════════════════════════════════════════════════════════
// GET /api/auth/callback — Launchpad OAuth callback handler
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  getAccessToken,
  getLaunchpadUser,
  findOrCreateUser,
  createSession,
  getOAuthSession,
  setSessionCookie,
  initDB,
} from '@/lib/auth'

export async function GET(request: NextRequest) {
  const url = request.nextUrl

  try {
    // Initialize database tables if needed
    await initDB()

    const oauthToken = url.searchParams.get('oauth_token')
    const oauthVerifier = url.searchParams.get('oauth_verifier')

    if (!oauthToken || !oauthVerifier) {
      return NextResponse.redirect(new URL('/?auth=error&reason=missing_params', request.url))
    }

    // Retrieve the stored OAuth session (contains the request secret)
    const oauthSession = await getOAuthSession(oauthToken)

    if (!oauthSession) {
      return NextResponse.redirect(new URL('/?auth=error&reason=session_expired', request.url))
    }

    // Exchange request token + verifier for access token
    const { accessToken, accessSecret } = await getAccessToken(
      oauthToken,
      oauthSession.request_secret,
      oauthVerifier,
    )

    // Fetch the user's profile from Launchpad
    const lpUser = await getLaunchpadUser(accessToken, accessSecret)

    // Find or create user in our database
    const dbUser = await findOrCreateUser(lpUser)

    // Create a session for the user
    const sessionToken = await createSession(dbUser.id)

    // Redirect to home with session cookie
    const response = NextResponse.redirect(new URL('/?auth=success', request.url))
    response.headers.append('Set-Cookie', setSessionCookie(sessionToken))

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/?auth=error&reason=callback_failed', request.url))
  }
}
