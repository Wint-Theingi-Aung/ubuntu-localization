// ═══════════════════════════════════════════════════════════════════
// /api/glossary/suggestions — Glossary suggestion management
// GET: admin sees all pending, regular user sees own suggestions
// PUT: admin-only (approve/reject a suggestion)
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  listGlossarySuggestions,
  updateGlossarySuggestionStatus,
  addDbGlossaryEntry,
  recordGlossaryHistory,
  queryOne,
  initDB,
  type DbGlossaryEntry,
} from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// ── Serialize dates to ISO strings for JSON response ────────────

function serializeDates(entry: Record<string, any>): Record<string, any> {
  return {
    ...entry,
    createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt ?? null,
    updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt ?? null,
    reviewedAt: entry.reviewedAt instanceof Date ? entry.reviewedAt.toISOString() : entry.reviewedAt ?? null,
  }
}

// ── GET: List suggestions ───────────────────────────────────────

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
    const status = url.searchParams.get('status') || undefined

    // Admin sees all suggestions; regular user sees only their own
    const userId = user.isAdmin ? undefined : user.id
    const effectiveStatus = user.isAdmin ? status : 'pending'

    const { entries, total } = await listGlossarySuggestions(limit, offset, effectiveStatus, userId)

    return NextResponse.json({ entries: entries.map(serializeDates), total })
  } catch (error) {
    console.error('Glossary suggestions fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 },
    )
  }
}

// ── PUT: Approve or reject a suggestion (admin-only) ────────────

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

    const body = await request.json()
    const { id, status, reviewNote } = body

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { error: 'Suggestion id is required' },
        { status: 400 },
      )
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "approved" or "rejected"' },
        { status: 400 },
      )
    }

    const suggestion = await updateGlossarySuggestionStatus(id, status, user.id, reviewNote)
    if (!suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 },
      )
    }

    // If approved, copy to the approved glossary table
    if (status === 'approved') {
      if (suggestion.action === 'add') {
        // Check for duplicate English term
        const existing = await queryOne<DbGlossaryEntry>(
          'SELECT id FROM glossary WHERE en = $1',
          [suggestion.en],
        )
        if (existing) {
          return NextResponse.json(
            { error: `Term "${suggestion.en}" already exists in the glossary` },
            { status: 409 },
          )
        }

        const entry = await addDbGlossaryEntry(
          {
            en: suggestion.en,
            my: suggestion.my,
            shn: suggestion.shn,
            mnw: suggestion.mnw,
            ksw: suggestion.ksw,
            note: suggestion.note,
          },
          suggestion.submittedBy || undefined,
        )

        await recordGlossaryHistory({
          userId: user.id,
          glossaryId: entry.id,
          action: 'add',
          newValues: { en: entry.en, my: entry.my, shn: entry.shn, mnw: entry.mnw, ksw: entry.ksw, note: entry.note },
          termEn: entry.en,
        })
      }
      // Future: handle 'update' and 'delete' suggestion actions
    }

    return NextResponse.json({ suggestion: serializeDates(suggestion) })
  } catch (error) {
    console.error('Glossary suggestion review error:', error)
    return NextResponse.json(
      { error: 'Failed to review suggestion' },
      { status: 500 },
    )
  }
}
