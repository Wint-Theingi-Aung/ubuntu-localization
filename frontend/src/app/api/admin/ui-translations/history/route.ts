// ═══════════════════════════════════════════════════════════════════
// /api/admin/ui-translations/history — UI translation change history
// GET: admin-only (returns change history)
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { getUiTranslationHistory, initDB } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

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
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      )
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const lang = url.searchParams.get('lang') || undefined

    const { entries, total } = await getUiTranslationHistory(limit, offset, lang)

    return NextResponse.json({
      entries: entries.map(e => ({
        id: e.id,
        userId: e.userId,
        lang: e.lang,
        key: e.key,
        oldValue: e.oldValue,
        newValue: e.newValue,
        username: e.username,
        displayName: e.displayName,
        createdAt: new Date(e.createdAt).getTime(),
      })),
      total,
    })
  } catch (error) {
    console.error('UI translation history fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch UI translation history' },
      { status: 500 },
    )
  }
}
