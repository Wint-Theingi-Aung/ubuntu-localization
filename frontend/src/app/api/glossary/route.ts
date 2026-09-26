// ═══════════════════════════════════════════════════════════════════
// /api/glossary — Glossary CRUD with suggestion + moderation
// GET: public (approved entries only)
// POST: auth required (creates pending suggestion)
// PUT: admin-only (updates approved entries)
// DELETE: admin-only (deletes approved entries)
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  getDbGlossary,
  addDbGlossaryEntry,
  updateDbGlossaryEntry,
  deleteDbGlossaryEntry,
  createGlossarySuggestion,
  queryOne,
  recordGlossaryHistory,
  initDB,
  seedGlossaryIfEmpty,
  type DbGlossaryEntry,
} from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// ── GET: List approved glossary entries (public) ────────────────

export async function GET() {
  try {
    await initDB()
    await seedGlossaryIfEmpty()
    const entries = await getDbGlossary()
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Glossary fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch glossary' },
      { status: 500 },
    )
  }
}

// ── POST: Submit a glossary suggestion (login required) ─────────

export async function POST(request: NextRequest) {
  try {
    await initDB()

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to submit suggestions' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { en, my, shn, mnw, ksw, note } = body

    if (!en || typeof en !== 'string' || en.trim().length === 0) {
      return NextResponse.json(
        { error: 'English term (en) is required' },
        { status: 400 },
      )
    }

    const suggestion = await createGlossarySuggestion(user.id, {
      action: 'add',
      en: en.trim(),
      my: my || '',
      shn: shn || '',
      mnw: mnw || '',
      ksw: ksw || '',
      note: note || '',
    })

    return NextResponse.json({
      suggestion,
      message: 'Suggestion submitted for review',
    }, { status: 201 })
  } catch (error) {
    console.error('Glossary suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to submit suggestion' },
      { status: 500 },
    )
  }
}

// ── PUT: Update an approved glossary entry (admin-only) ─────────

export async function PUT(request: NextRequest) {
  try {
    await initDB()

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to update glossary entries' },
        { status: 401 },
      )
    }
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required to update approved glossary entries' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { id, en, my, shn, mnw, ksw, note } = body

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { error: 'Entry id is required' },
        { status: 400 },
      )
    }

    const oldEntry = await queryOne<DbGlossaryEntry>(
      'SELECT * FROM glossary WHERE id = $1',
      [id],
    )

    const entry = await updateDbGlossaryEntry(id, { en, my, shn, mnw, ksw, note })

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found or no changes' },
        { status: 404 },
      )
    }

    await recordGlossaryHistory({
      userId: user.id,
      glossaryId: id,
      action: 'update',
      oldValues: oldEntry ? { en: oldEntry.en, my: oldEntry.my, shn: oldEntry.shn, mnw: oldEntry.mnw, ksw: oldEntry.ksw, note: oldEntry.note } : undefined,
      newValues: { en: entry.en, my: entry.my, shn: entry.shn, mnw: entry.mnw, ksw: entry.ksw, note: entry.note },
      termEn: entry.en,
    })

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Glossary update error:', error)
    return NextResponse.json(
      { error: 'Failed to update glossary entry' },
      { status: 500 },
    )
  }
}

// ── DELETE: Remove an approved glossary entry (admin-only) ──────

export async function DELETE(request: NextRequest) {
  try {
    await initDB()

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to delete glossary entries' },
        { status: 401 },
      )
    }
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required to delete approved glossary entries' },
        { status: 403 },
      )
    }

    const url = new URL(request.url)
    const idParam = url.searchParams.get('id')

    if (!idParam) {
      return NextResponse.json(
        { error: 'Entry id is required' },
        { status: 400 },
      )
    }

    const id = parseInt(idParam, 10)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid entry id' },
        { status: 400 },
      )
    }

    const entry = await queryOne<DbGlossaryEntry>(
      'SELECT * FROM glossary WHERE id = $1',
      [id],
    )

    const deleted = await deleteDbGlossaryEntry(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 },
      )
    }

    if (entry) {
      await recordGlossaryHistory({
        userId: user.id,
        glossaryId: id,
        action: 'delete',
        oldValues: { en: entry.en, my: entry.my, shn: entry.shn, mnw: entry.mnw, ksw: entry.ksw, note: entry.note },
        termEn: entry.en,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Glossary delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete glossary entry' },
      { status: 500 },
    )
  }
}
