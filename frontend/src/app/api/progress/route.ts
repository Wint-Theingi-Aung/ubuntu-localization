import { NextRequest, NextResponse } from 'next/server'

// In-memory store for demo purposes
// In production, use Redis or similar
const progressStore = new Map<string, {
  total: number
  translated: number
  status: 'pending' | 'translating' | 'complete' | 'error'
}>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Session ID required' },
      { status: 400 }
    )
  }

  const progress = progressStore.get(sessionId)

  if (!progress) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    total: progress.total,
    translated: progress.translated,
    remaining: progress.total - progress.translated,
    completion_pct: progress.total > 0
      ? Math.round((progress.translated / progress.total) * 100)
      : 100,
    status: progress.status,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { session_id, total, translated, status } = body

  if (!session_id) {
    return NextResponse.json(
      { error: 'Session ID required' },
      { status: 400 }
    )
  }

  progressStore.set(session_id, {
    total: total || 0,
    translated: translated || 0,
    status: status || 'pending',
  })

  return NextResponse.json({ success: true })
}
