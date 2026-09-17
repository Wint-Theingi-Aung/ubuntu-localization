import { NextRequest, NextResponse } from 'next/server'
import { generatePoContent } from '@/lib/po-parser'
import { compareFormatSpecifiers } from '@/lib/translate'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entries, language_code, filename, po_headers } = body

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'No entries provided for export.' },
        { status: 400 }
      )
    }

    // Validate format specifiers for all entries with translations
    const mismatches: Array<{ index: number; msgid: string; missing: string[]; extra: string[]; orderMismatch: boolean }> = []
    for (const entry of entries) {
      if (entry.msgstr && entry.msgid) {
        const { missing, extra, orderMismatch } = compareFormatSpecifiers(entry.msgid, entry.msgstr)
        if (missing.length > 0 || extra.length > 0 || orderMismatch) {
          mismatches.push({ index: entry.index, msgid: entry.msgid, missing, extra, orderMismatch })
        }
      }
    }

    // Clear msgstr on entries with format specifier mismatches so they remain untranslated
    if (mismatches.length > 0) {
      const mismatchIndices = new Set(mismatches.map(m => m.index))
      for (const entry of entries) {
        if (mismatchIndices.has(entry.index)) {
          entry.msgstr = ''
        }
      }
    }

    // Preserve original headers from uploaded file, fall back to defaults
    const defaultHeaders: Record<string, string> = {
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
    const headers: Record<string, string> = { ...defaultHeaders, ...(po_headers || {}) }

    // Generate .po content — preserve entry metadata from upload
    const poContent = generatePoContent(
      entries.map((e: any) => ({
        index: e.index,
        msgid: e.msgid,
        msgstr: e.msgstr,
        msgctxt: e.msgctxt || undefined,
        flags: e.flags || [],
        occurrences: e.occurrences || [],
        tcomment: e.tcomment || undefined,
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
