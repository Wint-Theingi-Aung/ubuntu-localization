// ═══════════════════════════════════════════════════════════════════
// /api/glossary/auth — Password validation for glossary management
// ═══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { isGlossaryAdmin, isGlossaryAuthRequired } from '@/lib/glossary-auth'

export async function GET() {
  return NextResponse.json({ authRequired: isGlossaryAuthRequired() })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!isGlossaryAuthRequired()) {
      return NextResponse.json({ authenticated: true })
    }

    if (isGlossaryAdmin(password)) {
      return NextResponse.json({ authenticated: true })
    }

    return NextResponse.json(
      { authenticated: false, error: 'Invalid password' },
      { status: 401 },
    )
  } catch {
    return NextResponse.json(
      { error: 'Auth check failed' },
      { status: 500 },
    )
  }
}
