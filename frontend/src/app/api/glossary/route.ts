// ═══════════════════════════════════════════════════════════════════
// /api/glossary — Glossary CRUD (reads public, writes require login)
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  getDbGlossary,
  addDbGlossaryEntry,
  updateDbGlossaryEntry,
  deleteDbGlossaryEntry,
  queryOne,
  recordGlossaryHistory,
  initDB,
  seedGlossaryIfEmpty,
  type DbGlossaryEntry,
} from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// ── GET: List glossary entries (public) ────────────────────────

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

// ── POST: Add a glossary entry (login required) ───────────────

export async function POST(request: NextRequest) {
  try {
    await initDB()

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to add glossary entries' },
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

    const entry = await addDbGlossaryEntry(
      { en: en.trim(), my: my || '', shn: shn || '', mnw: mnw || '', ksw: ksw || '', note: note || '' },
      user.id,
    )

    // Record history
    await recordGlossaryHistory({
      userId: user.id,
      glossaryId: entry.id,
      action: 'add',
      newValues: { en: entry.en, my: entry.my, shn: entry.shn, mnw: entry.mnw, ksw: entry.ksw, note: entry.note },
      termEn: entry.en,
    })

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error('Glossary add error:', error)
    return NextResponse.json(
      { error: 'Failed to add glossary entry' },
      { status: 500 },
    )
  }
}

// ── PUT: Update a glossary entry (login required) ─────────────

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

    // Get old entry for history
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

    // Record history
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

// ── DELETE: Remove a glossary entry (login required) ───────────

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

    // Get entry before deletion for history
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

    // Record history
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
