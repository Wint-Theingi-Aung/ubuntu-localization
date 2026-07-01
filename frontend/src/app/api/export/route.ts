import { NextRequest, NextResponse } from 'next/server'
import { generatePoContent } from '@/lib/po-parser'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entries, language_code, filename } = body

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'No entries provided for export.' },
        { status: 400 }
      )
    }

    // Build headers
    const headers: Record<string, string> = {
      'Project-Id-Version': 'Ubuntu',
      'Report-Msgid-Bugs-To': '',
      'POT-Creation-Date': new Date().toISOString(),
      'PO-Revision-Date': new Date().toISOString(),
      'Last-Translator': 'Ubuntu Localization Tool',
      'Language': language_code || 'my',
      'MIME-Version': '1.0',
      'Content-Type': 'text/plain; charset=UTF-8',
      'Content-Transfer-Encoding': '8bit',
    }

    // Generate .po content
    const poContent = generatePoContent(
      entries.map((e: { index: number; msgid: string; msgstr: string }) => ({
        index: e.index,
        msgid: e.msgid,
        msgstr: e.msgstr,
        flags: [],
        occurrences: [],
      })),
      headers
    )

    // Build timestamped filename
    const now = new Date()
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const baseName = (filename || 'messages.po').replace(/\.pot?$/, '')

    // Return as downloadable file
    return new NextResponse(poContent, {
      headers: {
        'Content-Type': 'text/x-gettext-translation; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}-${ts}.po"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate .po file' },
      { status: 500 }
    )
  }
}
