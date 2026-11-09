import { NextRequest, NextResponse } from 'next/server'
import { translateBatch, verifyTranslation } from '@/lib/translate'
import { getGlossaryForTranslation, initDB } from '@/lib/db'

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

    // Fetch glossary terms for the target language
    let glossaryTerms: { en: string; translated: string; note: string }[] = []
    try {
      await initDB()
      glossaryTerms = await getGlossaryForTranslation(langCode)
    } catch {
      // Glossary fetch failed — continue without glossary context
    }

    // Extract msgids
    const msgids = entries.map((e: { msgid: string }) => e.msgid)

    // Translate batch (with glossary context). `translations[i]` lines up with
    // `entries[i]`; a null slot means the model returned nothing for that
    // string, which is reported instead of failing the other results.
    const translations = await translateBatch(msgids, langName, langCode, glossaryTerms)

    const results: Array<{
      index: number
      msgid: string
      translated: string
      qa_passed: boolean
      qa_checks: ReturnType<typeof verifyTranslation>['checks']
    }> = []
    const failed: number[] = []

    entries.forEach((entry: { index: number; msgid: string }, i: number) => {
      const translated = translations[i]
      if (typeof translated !== 'string' || translated.trim().length === 0) {
        failed.push(entry.index)
        return
      }
      const qa = verifyTranslation(entry.msgid, translated, entry.index)
      results.push({
        index: entry.index,
        msgid: entry.msgid,
        translated,
        qa_passed: qa.passed,
        qa_checks: qa.checks,
      })
    })

    // Nothing usable came back — surface it as an error the UI can show.
    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Gemini returned no usable translations for this batch. Please try again.' },
        { status: 502 }
      )
    }

    const passed = results.filter((r: { qa_passed: boolean }) => r.qa_passed).length

    return NextResponse.json({
      translations: results,
      summary: {
        total: results.length,
        passed,
        failed: results.length - passed,
        untranslated: failed.length,
      },
      failed_indexes: failed,
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
