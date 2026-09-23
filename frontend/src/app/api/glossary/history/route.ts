// ═══════════════════════════════════════════════════════════════════
// /api/glossary/history — Glossary change history
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getGlossaryHistory, initDB } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// ── GET: Fetch glossary history ────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    await initDB()

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      )
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    // Admin can see all history, regular users only see their own
    const userId = user.isAdmin ? undefined : user.id

    const { entries, total } = await getGlossaryHistory(limit, offset, userId)

    return NextResponse.json({
      entries: entries.map(e => ({
        id: e.id,
        userId: e.userId,
        glossaryId: e.glossaryId,
        action: e.action,
        oldValues: e.oldValues,
        newValues: e.newValues,
        termEn: e.termEn,
        username: e.username,
        displayName: e.displayName,
        createdAt: new Date(e.createdAt).getTime(),
      })),
      total,
    })
  } catch (error) {
    console.error('Glossary history fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch glossary history' },
      { status: 500 },
    )
  }
}
