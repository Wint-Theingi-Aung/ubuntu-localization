// ═══════════════════════════════════════════════════════════════════
// /api/glossary — Glossary CRUD with suggestion + moderation
// GET: public (approved entries only)
// POST: auth required (creates pending suggestion for add/update/delete)
// PUT: auth required (creates pending update suggestion)
// DELETE: auth required (creates pending delete suggestion)
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  getDbGlossary,
  createGlossarySuggestion,
  queryOne,
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
    const { action, id, en, my, shn, mnw, ksw, note } = body

    // Validate action
    if (!action || !['add', 'update', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "add", "update", or "delete"' },
        { status: 400 },
      )
    }

    // For update and delete, require existing term id
    if ((action === 'update' || action === 'delete') && (!id || typeof id !== 'number')) {
      return NextResponse.json(
        { error: 'Term id is required for update/delete actions' },
        { status: 400 },
      )
    }

    // For add and update, require English term
    if ((action === 'add' || action === 'update') && (!en || typeof en !== 'string' || en.trim().length === 0)) {
      return NextResponse.json(
        { error: 'English term (en) is required' },
        { status: 400 },
      )
    }

    // For update/delete, fetch existing entry to store old values
    let existingEntry: DbGlossaryEntry | null = null
    if (action === 'update' || action === 'delete') {
      existingEntry = await queryOne<DbGlossaryEntry>(
        'SELECT * FROM glossary WHERE id = $1',
        [id],
      )
      if (!existingEntry) {
        return NextResponse.json(
          { error: 'Term not found' },
          { status: 404 },
        )
      }
    }

    const suggestion = await createGlossarySuggestion(user.id, {
      action,
      glossaryId: action !== 'add' ? id : undefined,
      en: en?.trim() || existingEntry?.en || '',
      my: my ?? existingEntry?.my ?? '',
      shn: shn ?? existingEntry?.shn ?? '',
      mnw: mnw ?? existingEntry?.mnw ?? '',
      ksw: ksw ?? existingEntry?.ksw ?? '',
      note: note ?? existingEntry?.note ?? '',
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

// ── PUT: Submit an update suggestion (login required) ───────────

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

    const body = await request.json()
    const { id, en, my, shn, mnw, ksw, note } = body

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { error: 'Entry id is required' },
        { status: 400 },
      )
    }

    // Fetch existing entry
    const existingEntry = await queryOne<DbGlossaryEntry>(
      'SELECT * FROM glossary WHERE id = $1',
      [id],
    )

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 },
      )
    }

    // Create update suggestion
    const suggestion = await createGlossarySuggestion(user.id, {
      action: 'update',
      glossaryId: id,
      en: en?.trim() || existingEntry.en,
      my: my ?? existingEntry.my,
      shn: shn ?? existingEntry.shn,
      mnw: mnw ?? existingEntry.mnw,
      ksw: ksw ?? existingEntry.ksw,
      note: note ?? existingEntry.note,
    })

    return NextResponse.json({
      suggestion,
      message: 'Update suggestion submitted for review',
    }, { status: 201 })
  } catch (error) {
    console.error('Glossary update suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to submit update suggestion' },
      { status: 500 },
    )
  }
}

// ── DELETE: Submit a delete suggestion (login required) ─────────

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

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 },
      )
    }

    // Create delete suggestion
    const suggestion = await createGlossarySuggestion(user.id, {
      action: 'delete',
      glossaryId: id,
      en: entry.en,
      my: entry.my,
      shn: entry.shn,
      mnw: entry.mnw,
      ksw: entry.ksw,
      note: entry.note,
    })

    return NextResponse.json({
      suggestion,
      message: 'Delete suggestion submitted for review',
    }, { status: 201 })
  } catch (error) {
    console.error('Glossary delete suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to submit delete suggestion' },
      { status: 500 },
    )
  }
}
