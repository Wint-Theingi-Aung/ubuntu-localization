// ═══════════════════════════════════════════════════════════════════
// /api/history — Translation history (GET/POST)
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getDbHistory, recordDbHistory, initDB } from '@/lib/db'

// ── GET: Fetch translation history ─────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await initDB()

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const userId = parseInt(url.searchParams.get('userId') || '0', 10)

    if (!userId) {
      return NextResponse.json({ entries: [] })
    }

    const entries = await getDbHistory(userId, limit)

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: String(e.id),
        timestamp: new Date(e.created_at).getTime(),
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

    const body = await request.json()
    const { action, description, descriptionKey, descriptionParams, language, details, detailsKey, detailsParams } = body

    if (!action || !description) {
      return NextResponse.json(
        { error: 'action and description are required' },
        { status: 400 },
      )
    }

    await recordDbHistory({
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
