import { NextRequest, NextResponse } from 'next/server'
import { parsePoFile } from '@/lib/po-parser'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const targetLang = formData.get('target_lang') as string || 'my'

    // Validate file presence
    if (!file || !file.name) {
      return NextResponse.json(
        { error: 'No file selected. Please choose a .po file to upload.' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.name.endsWith('.po') && !file.name.endsWith('.pot')) {
      return NextResponse.json(
        { error: 'Only .po and .pot files are supported.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.` },
        { status: 400 }
      )
    }

    // Read and parse
    const content = await file.text()
    const parsed = parsePoFile(content, file.name)

    // Detect language from headers or use target
    const langCode = targetLang

    // Return parsed data
    return NextResponse.json({
      filename: file.name,
      language_code: langCode,
      metadata: parsed.metadata,
      entries: parsed.untranslated.map(e => ({
        index: e.index,
        msgid: e.msgid,
        msgstr: '',
        msgctxt: e.msgctxt,
        status: 'pending',
      })),
      all_entries: parsed.all_entries.map(e => ({
        index: e.index,
        msgid: e.msgid,
        msgstr: e.msgstr,
        msgctxt: e.msgctxt,
      })),
      po_headers: parsed.po_headers,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: `Failed to parse .po file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
