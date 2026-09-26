// ═══════════════════════════════════════════════════════════════════
// /api/admin/ui-translations — UI translation management
// GET: public (returns all translations for client i18n)
// PUT: admin-only (updates translation values)
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  getAllUiTranslations,
  getUiTranslationKeys,
  upsertUiTranslations,
  initDB,
} from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// ── GET: Fetch all UI translations (public) ──────────────────

export async function GET() {
  try {
    await initDB()
    const translations = await getAllUiTranslations()
    const keys = await getUiTranslationKeys()
    return NextResponse.json({ translations, keys })
  } catch (error) {
    console.error('UI translations fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch UI translations' },
      { status: 500 },
    )
  }
}

// ── PUT: Update UI translations (admin-only) ─────────────────

export async function PUT(request: NextRequest) {
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

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      )
    }

    const { lang, translations } = body

    if (!lang || typeof lang !== 'string') {
      return NextResponse.json(
        { error: 'Language code is required' },
        { status: 400 },
      )
    }

    const validLangs = ['en', 'my', 'shn', 'mnw', 'ksw']
    if (!validLangs.includes(lang)) {
      return NextResponse.json(
        { error: 'Invalid language code' },
        { status: 400 },
      )
    }

    if (!translations || typeof translations !== 'object') {
      return NextResponse.json(
        { error: 'Translations object is required' },
        { status: 400 },
      )
    }

    // Filter out empty values (only save non-empty translations)
    const toSave: Record<string, string> = {}
    for (const [key, value] of Object.entries(translations)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        toSave[key] = value.trim()
      }
    }

    await upsertUiTranslations(lang, toSave, user.id)

    return NextResponse.json({ success: true, saved: Object.keys(toSave).length })
  } catch (error) {
    console.error('UI translations update error:', error)
    return NextResponse.json(
      { error: 'Failed to update UI translations' },
      { status: 500 },
    )
  }
}
