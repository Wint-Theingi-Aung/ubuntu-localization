import { NextResponse } from 'next/server'

// In-memory store for unique visitor UUIDs
// Resets on cold start (serverless) — acceptable for a personal project
const uniqueVisitors = new Set<string>()

export async function GET() {
  return NextResponse.json({ count: uniqueVisitors.size })
}

export async function POST(request: Request) {
  try {
    const { uuid } = await request.json()
    if (uuid && typeof uuid === 'string') {
      uniqueVisitors.add(uuid)
    }
    return NextResponse.json({ count: uniqueVisitors.size })
  } catch {
    return NextResponse.json({ count: uniqueVisitors.size })
  }
}
