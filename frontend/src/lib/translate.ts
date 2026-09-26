/**
 * Translation service using Google Gemini API
 */

import { PoEntry } from './po-parser'

/** Language metadata for translation prompts */
const LANGUAGES: Record<string, { name: string; script: string; word_order: string }> = {
  my: { name: 'Burmese', script: 'Myanmar Unicode', word_order: 'SOV' },
  shn: { name: 'Shan', script: 'Shan Unicode', word_order: 'SVO' },
  mnw: { name: 'Mon', script: 'Mon Unicode', word_order: 'SVO' },
  ksw: { name: 'S\'gaw Karen', script: 'S\'gaw Karen Unicode', word_order: 'SVO' },
}

export interface TranslationRequest {
  entries: Array<{ index: number; msgid: string }>
  target_lang: string
}

export interface TranslationResult {
  index: number
  msgid: string
  translated: string
}

export interface GlossaryTerm {
  en: string
  translated: string
  note: string
}

export interface BatchValidationResult {
  ok: boolean
  error?: string
  translationMap?: Map<number, string>
}

/**
 * Validate a batch translation response from the API.
 *
 * Rejects the entire batch if:
 * - response is not an array
 * - any result object is malformed (missing numeric index or string translated)
 * - count doesn't match requested count
 * - duplicate indexes
 * - missing indexes (requested but not in response)
 * - unexpected indexes (in response but not requested)
 * - any translated value is empty or whitespace-only
 *
 * On success, returns a Map of index → translated string.
 */
export function validateBatchResponse(
  response: unknown,
  requestedIndexes: number[],
): BatchValidationResult {
  if (!response || !Array.isArray(response)) {
    return { ok: false, error: 'Invalid translation response: expected an array' }
  }

  for (const t of response) {
    if (!t || typeof t !== 'object' || typeof t.index !== 'number' || typeof t.translated !== 'string') {
      return { ok: false, error: 'Invalid translation result object: each result must have numeric index and string translated' }
    }
  }

  if (response.length !== requestedIndexes.length) {
    return {
      ok: false,
      error: `Incomplete batch response: expected ${requestedIndexes.length} results, got ${response.length}. No translations applied.`,
    }
  }

  const responseIndexes = response.map((t: { index: number }) => t.index)
  const responseSet = new Set(responseIndexes)

  if (responseSet.size !== responseIndexes.length) {
    const seen = new Set<number>()
    const dupes = responseIndexes.filter((i: number) => seen.has(i) || (seen.add(i), false))
    return {
      ok: false,
      error: `Duplicate indexes in response: [${dupes.join(', ')}]. No translations applied.`,
    }
  }

  const requestedSet = new Set(requestedIndexes)
  for (const idx of requestedIndexes) {
    if (!responseSet.has(idx)) {
      return {
        ok: false,
        error: `Missing index ${idx} in batch response. No translations applied.`,
      }
    }
  }

  for (const idx of responseSet) {
    if (!requestedSet.has(idx)) {
      return {
        ok: false,
        error: `Unexpected index ${idx} in batch response. No translations applied.`,
      }
    }
  }

  for (const t of response) {
    if (!t.translated || t.translated.trim().length === 0) {
      return {
        ok: false,
        error: `Empty translation for index ${t.index}. No translations applied.`,
      }
    }
  }

  const translationMap = new Map<number, string>()
  for (const t of response) {
    translationMap.set(t.index, t.translated)
  }

  return { ok: true, translationMap }
}

export function buildSystemPrompt(
  targetLang: string,
  langCode: string,
  glossaryTerms?: GlossaryTerm[],
): string {
  const langInfo = LANGUAGES[langCode] || LANGUAGES.my

  let prompt = `You are a professional Ubuntu Linux localization engine.

Target Language: ${targetLang} (${langCode})
Script: ${langInfo.script}
Word Order: ${langInfo.word_order}

Rules:
- CRITICAL: Preserve ALL printf-style format specifiers EXACTLY as they appear in the source. Do NOT translate, modify, reorder, or remove them. This includes:
  Simple: %s, %d, %f, %u, %c, %e, %g, %o, %x, %p
  With length: %ld, %lu, %lld, %llu, %hd, %hu, %Lf, %zu, %td
  With flags/width/precision: %02d, %-20s, %.16s, %.*s, %+10.5f, %#x
  Named: %(name)s, %(count)d
  Positional: %1$s, %2$d
  Escaped literal: %% (literal percent sign — keep as %%)
- Preserve HTML tags exactly as they appear: <strong>, </strong>, <b>, </b>, <em>, </em>, <i>, </i>, <span>, </span>, <p>, </p>, <br/>, <a>, </a>, <code>, </code>, <pre>, </pre>, <ul>, </ul>, <ol>, </ol>, <li>, </li>, <div>, </div>, <h1>–<h6>, etc. Do NOT rename, remove, or invent tags. Opening and closing tags must remain correctly matched. Only translate text content between tags. Also preserve XML entities: &amp; &#160; etc.
- CRITICAL: Preserve mnemonic underscores EXACTLY as they appear. A mnemonic is an underscore followed by a single letter (e.g. _E, _F, _S). These mark keyboard accelerator keys in GTK/Qt UIs. Do NOT remove, translate, reorder, or alter them. Keep the underscore and the letter exactly as-is in the original. Example: "_Edit Selected Profile" → "_E တည်းဖြတ်ပါ" (the _E stays unchanged)
- Preserve newlines (\\n) and whitespace patterns character-for-character
- Keep Ubuntu/Linux technical terms UNTRANSLATED:
  Kernel, GNOME, sudo, apt, repository, GRUB, X11, Wayland, ext4, Btrfs,
  LVM, DHCP, DNS, SSH, VPN, TCP, systemd, dbus, PulseAudio, PipeWire,
  AppArmor, Ubuntu, Canonical, Debian, Firefox, LibreOffice
- Translate ONLY natural language text
- Maintain the OS/software context — this is NOT general text
- For menu items and button labels: use concise imperative form
- For help text and descriptions: use natural explanatory language
- For error messages: clear, actionable, respectful tone
- Return ONLY a JSON array of translated strings, in the same order as input
- If a string should NOT be translated (brand names, code, symbols), return it unchanged
  - NEVER use Zawgyi encoding — always Unicode Myanmar (Burmese only)

Input is a JSON array of msgid strings to translate.`

  // Append glossary terms if available
  if (glossaryTerms && glossaryTerms.length > 0) {
    const glossaryLines = glossaryTerms
      .map(t => {
        let line = `  "${t.en}" → "${t.translated}"`
        if (t.note) line += ` (note: ${t.note})`
        return line
      })
      .join('\n')

    prompt += `\n\nGlossary (${glossaryTerms.length} terms) — use these exact translations consistently:\n${glossaryLines}`
  }

  return prompt
}

export async function translateBatch(
  texts: string[],
  targetLang: string,
  langCode: string,
  glossaryTerms?: GlossaryTerm[],
): Promise<string[]> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Google API key not configured. Set GOOGLE_API_KEY in environment.')
  }

  const prompt = buildSystemPrompt(targetLang, langCode, glossaryTerms)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${prompt}\n\nInput:\n${JSON.stringify(texts)}`
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            minItems: texts.length,
            maxItems: texts.length,
            items: { type: 'STRING' }
          }
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!result) {
    throw new Error('Empty response from Gemini API')
  }

  const parsed = JSON.parse(result)

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid response format from Gemini API')
  }

  // Never silently accept a partial/empty batch. The UI must receive
  // all 10 translations from this single API request so it can show
  // the complete batch before Review.
  if (parsed.length !== texts.length) {
    throw new Error(
      `Gemini returned ${parsed.length} of ${texts.length} translations. Please try this batch again.`
    )
  }

  const invalid = parsed.findIndex(
    (value) => typeof value !== 'string' || value.trim().length === 0
  )
  if (invalid !== -1) {
    throw new Error(
      `Gemini returned an empty translation for item ${invalid + 1} of ${texts.length}. Please try this batch again.`
    )
  }

  return parsed
}

export interface QACheck {
  name: string
  passed: boolean
  detail: string
}

export interface QAResult {
  index: number
  msgid: string
  translated: string
  checks: QACheck[]
  passed: boolean
}

/**
 * Extract all printf-style format specifiers and i18n placeholders from a string.
 * Returns them in order of appearance.
 *
 * Covers: %s %d %f %u %c %e %g %o %x %p,
 * length modifiers (%ld %lld %hd %Lf %zu %td etc.),
 * flags/width/precision (%02d %-20s %.16s %.*s %+10.5f %#x),
 * named (%(name)s), positional (%1$s), escaped (%%).
 */
export function extractFormatSpecifiers(str: string): string[] {
  // eslint-disable-next-line no-control-regex
  const printfRegex = /%(?:%\$|\d+\$|\(.*?\))?[+#-0 *]*(?:\d+|\*)?(?:\.(?:\d+|\*))?(?:hh?|ll?|[Lqjzt])?[diouxXeEfFgGaAcspn%]/g
  const specifiers = str.match(printfRegex) || []
  // Filter out %% (literal percent) — it's not a data placeholder
  return specifiers.filter(s => s !== '%%')
}

/**
 * Compare format specifiers between source and translation.
 * Returns an object with missing, extra, orderMismatch, and whether they match.
 *
 * Order matters: printf-style specifiers are positional — %s %d is different
 * from %d %s.  Launchpad rejects translations where argument order changes.
 */
export function compareFormatSpecifiers(
  msgid: string,
  msgstr: string
): { missing: string[]; extra: string[]; orderMismatch: boolean; match: boolean } {
  const srcSpecs = extractFormatSpecifiers(msgid)
  const tgtSpecs = extractFormatSpecifiers(msgstr)

  const srcCounts = new Map<string, number>()
  for (const s of srcSpecs) srcCounts.set(s, (srcCounts.get(s) || 0) + 1)

  const tgtCounts = new Map<string, number>()
  for (const s of tgtSpecs) tgtCounts.set(s, (tgtCounts.get(s) || 0) + 1)

  const missing: string[] = []
  for (const [spec, count] of srcCounts) {
    const tgtCount = tgtCounts.get(spec) || 0
    if (tgtCount < count) {
      for (let i = 0; i < count - tgtCount; i++) missing.push(spec)
    }
  }

  const extra: string[] = []
  for (const [spec, count] of tgtCounts) {
    const srcCount = srcCounts.get(spec) || 0
    if (count > srcCount) {
      for (let i = 0; i < count - srcCount; i++) extra.push(spec)
    }
  }

  // Check positional order: each matched specifier must appear in the same
  // sequence.  We walk both lists in parallel, greedily matching specifiers
  // that exist in both.  If the remaining matched sequences differ, the
  // argument order has changed and Launchpad will reject the translation.
  let orderMismatch = false
  if (missing.length === 0 && extra.length === 0 && srcSpecs.length > 0) {
    const matchedSrc = srcSpecs.filter(s => tgtCounts.has(s))
    const matchedTgt = tgtSpecs.filter(s => srcCounts.has(s))
    if (matchedSrc.length !== matchedTgt.length ||
        matchedSrc.some((s, i) => s !== matchedTgt[i])) {
      orderMismatch = true
    }
  }

  return {
    missing,
    extra,
    orderMismatch,
    match: missing.length === 0 && extra.length === 0 && !orderMismatch,
  }
}

export function verifyTranslation(
  msgid: string,
  translated: string,
  index: number
): QAResult {
  const checks: QACheck[] = []

  // Check 1: Format specifier integrity (printf-style + i18n placeholders)
  const { missing, extra, orderMismatch, match } = compareFormatSpecifiers(msgid, translated)
  // Also check {{N}} positional placeholders used in some i18n frameworks
  const srcBrace: string[] = msgid.match(/\{\{\d+\}\}/g) || []
  const tgtBrace: string[] = translated.match(/\{\{\d+\}\}/g) || []
  const missingBrace = srcBrace.filter(p => !tgtBrace.includes(p))
  const extraBrace = tgtBrace.filter(p => !srcBrace.includes(p))
  // Also check %(name)s named placeholders
  const srcNamed: string[] = msgid.match(/%\([^)]+\)[a-z]/g) || []
  const tgtNamed: string[] = translated.match(/%\([^)]+\)[a-z]/g) || []
  const missingNamed = srcNamed.filter(p => !tgtNamed.includes(p))
  const extraNamed = tgtNamed.filter(p => !srcNamed.includes(p))

  const allMissing = [...missing, ...missingBrace, ...missingNamed]
  const allExtra = [...extra, ...extraBrace, ...extraNamed]
  const allMatch = match && missingBrace.length === 0 && extraBrace.length === 0 &&
                   missingNamed.length === 0 && extraNamed.length === 0

  let formatDetail = 'OK'
  if (!allMatch) {
    const parts: string[] = []
    if (allMissing.length) parts.push(`Missing: ${allMissing.join(', ')}`)
    if (allExtra.length) parts.push(`Extra: ${allExtra.join(', ')}`)
    if (orderMismatch) parts.push('Placeholder argument order changed')
    formatDetail = parts.join('; ')
  }

  checks.push({
    name: 'Format Specifiers',
    passed: allMatch,
    detail: formatDetail,
  })

  // Check 2: Mnemonic underscore integrity
  const srcMnemonics: string[] = msgid.match(/_[A-Za-z]/g) || []
  const tgtMnemonics: string[] = translated.match(/_[A-Za-z]/g) || []
  const missingMnemonics = srcMnemonics.filter(m => !tgtMnemonics.includes(m))
  const extraMnemonics = tgtMnemonics.filter(m => !srcMnemonics.includes(m))
  const mnemonicsMatch = missingMnemonics.length === 0 && extraMnemonics.length === 0

  let mnemonicDetail = 'OK'
  if (!mnemonicsMatch) {
    const parts: string[] = []
    if (missingMnemonics.length) parts.push(`Missing: ${missingMnemonics.join(', ')}`)
    if (extraMnemonics.length) parts.push(`Extra: ${extraMnemonics.join(', ')}`)
    mnemonicDetail = parts.join('; ')
  }

  checks.push({
    name: 'Mnemonic Underscores',
    passed: mnemonicsMatch,
    detail: mnemonicDetail,
  })

  // Check 3: Newline count
  const srcNewlines = (msgid.match(/\n/g) || []).length
  const tgtNewlines = (translated.match(/\n/g) || []).length
  checks.push({
    name: 'Newline Count',
    passed: srcNewlines === tgtNewlines,
    detail: `Source: ${srcNewlines}, Target: ${tgtNewlines}`,
  })

  // Check 4: Non-empty
  checks.push({
    name: 'Non-Empty',
    passed: translated.trim().length > 0,
    detail: translated.trim() ? 'OK' : 'Translation is empty',
  })

  // Check 5: Length ratio
  if (msgid) {
    const ratio = translated.length / msgid.length
    checks.push({
      name: 'Length Ratio',
      passed: ratio >= 0.3 && ratio <= 4.0,
      detail: `Ratio: ${ratio.toFixed(1)}x`,
    })
  }

  return {
    index,
    msgid,
    translated,
    checks,
    passed: checks.every(c => c.passed),
  }
}
