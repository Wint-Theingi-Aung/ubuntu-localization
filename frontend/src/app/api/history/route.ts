// ═══════════════════════════════════════════════════════════════════
// /api/history — Translation history (GET/POST authenticated only)
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, getDbHistory, recordDbHistory, initDB } from '@/lib/auth'

// ── GET: Fetch user's translation history ──────────────────────

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const cookies = request.headers.get('cookie')
    const user = await getCurrentUser(cookies)

    if (!user) {
      return NextResponse.json({ entries: [] })
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    const entries = await getDbHistory(user.id, limit)

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: String(e.id),
        timestamp: new Date(e.created_at).getTime(),
        user: user.username,
        action: e.action,
        description: e.description,
        descriptionKey: e.description_key,
        descriptionParams: e.description_params,
        language: e.language,
        details: e.details,
        detailsKey: e.details_key,
        detailsParams: e.details_params,
      })),
    })
  } catch (error) {
    console.error('History fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 },
    )
  }
}

// ── POST: Record a translation history entry ───────────────────

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const cookies = request.headers.get('cookie')
    const user = await getCurrentUser(cookies)

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to record history' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { action, description, descriptionKey, descriptionParams, language, details, detailsKey, detailsParams } = body

    if (!action || !description) {
      return NextResponse.json(
        { error: 'action and description are required' },
        { status: 400 },
      )
    }

    await recordDbHistory({
      userId: user.id,
      action,
      description,
      descriptionKey,
      descriptionParams,
      language,
      details,
      detailsKey,
      detailsParams,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('History record error:', error)
    return NextResponse.json(
      { error: 'Failed to record history' },
      { status: 500 },
    )
  }
}
