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

    // Return as downloadable file
    return new NextResponse(poContent, {
      headers: {
        'Content-Type': 'text/x-gettext-translation; charset=utf-8',
        'Content-Disposition': `attachment; filename="translated_${language_code}_${filename || 'messages.po'}"`,
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
