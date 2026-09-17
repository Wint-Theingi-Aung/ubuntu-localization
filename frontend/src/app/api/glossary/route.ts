// ═══════════════════════════════════════════════════════════════════
// /api/glossary — Glossary CRUD
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import {
  getDbGlossary,
  addDbGlossaryEntry,
  updateDbGlossaryEntry,
  deleteDbGlossaryEntry,
  initDB,
} from '@/lib/db'

// ── GET: List glossary entries (public) ────────────────────────

export async function GET() {
  try {
    await initDB()
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

// ── POST: Add a glossary entry ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    await initDB()

    const body = await request.json()
    const { en, my, shn, mnw, ksw } = body

    if (!en || typeof en !== 'string' || en.trim().length === 0) {
      return NextResponse.json(
        { error: 'English term (en) is required' },
        { status: 400 },
      )
    }

    const entry = await addDbGlossaryEntry(
      { en: en.trim(), my: my || '', shn: shn || '', mnw: mnw || '', ksw: ksw || '' },
    )

    return NextResponse.json({ entry }, { status: 201 })
  } catch (error) {
    console.error('Glossary add error:', error)
    return NextResponse.json(
      { error: 'Failed to add glossary entry' },
      { status: 500 },
    )
  }
}

// ── PUT: Update a glossary entry ───────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    await initDB()

    const body = await request.json()
    const { id, en, my, shn, mnw, ksw } = body

    if (!id || typeof id !== 'number') {
      return NextResponse.json(
        { error: 'Entry id is required' },
        { status: 400 },
      )
    }

    const entry = await updateDbGlossaryEntry(id, { en, my, shn, mnw, ksw })

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found or no changes' },
        { status: 404 },
      )
    }

    return NextResponse.json({ entry })
  } catch (error) {
    console.error('Glossary update error:', error)
    return NextResponse.json(
      { error: 'Failed to update glossary entry' },
      { status: 500 },
    )
  }
}

// ── DELETE: Remove a glossary entry ────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    await initDB()

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

    const deleted = await deleteDbGlossaryEntry(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 },
      )
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
