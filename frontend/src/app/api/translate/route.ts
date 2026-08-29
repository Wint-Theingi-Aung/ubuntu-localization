import { NextRequest, NextResponse } from 'next/server'
import { translateBatch, verifyTranslation } from '@/lib/translate'

const LANGUAGES: Record<string, string> = {
  my: 'Burmese',
  shn: 'Shan',
  mnw: 'Mon',
  ksw: 'S\'gaw Karen',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entries, target_lang } = body

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries provided for translation.' },
        { status: 400 }
      )
    }

    const langCode = target_lang || 'my'
    const langName = LANGUAGES[langCode] || 'Burmese'

    // Extract msgids
    const msgids = entries.map((e: { msgid: string }) => e.msgid)

    // Translate batch
    const translations = await translateBatch(msgids, langName, langCode)

    // QA verify
    const results = entries.map((entry: { index: number; msgid: string }, i: number) => {
      const translated = translations[i]
      const qa = verifyTranslation(entry.msgid, translated, entry.index)

      return {
        index: entry.index,
        msgid: entry.msgid,
        translated,
        qa_passed: qa.passed,
        qa_checks: qa.checks,
      }
    })

    const passed = results.filter((r: { qa_passed: boolean }) => r.qa_passed).length
    const failed = results.length - passed

    return NextResponse.json({
      translations: results,
      summary: {
        total: results.length,
        passed,
        failed,
      },
    })
  } catch (error) {
    console.error('Translation error:', error)

    // Handle rate limiting
    if (error instanceof Error && error.message.includes('429')) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a moment and try again.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    )
  }
}
