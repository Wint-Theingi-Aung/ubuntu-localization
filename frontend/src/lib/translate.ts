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

export function buildSystemPrompt(targetLang: string, langCode: string): string {
  const langInfo = LANGUAGES[langCode] || LANGUAGES.my

  return `You are a professional Ubuntu Linux localization engine.

Target Language: ${targetLang} (${langCode})
Script: ${langInfo.script}
Word Order: ${langInfo.word_order}

Rules:
- Preserve ALL placeholders exactly: %s, %d, %f, %u, {{0}}, {{1}}, %(name)s
- Preserve ALL HTML tags exactly as they appear: <strong>, </strong>, <b>, </b>, <em>, </em>, <i>, </i>, <span>, </span>, <p>, </p>, <br/>, <a>, </a>, <code>, </code>, <pre>, </pre>, <ul>, </ul>, <ol>, </ol>, <li>, </li>, <div>, </div>, <h1>–<h6>, etc. Do NOT rename, remove, or invent tags. Opening and closing tags must remain correctly matched. Only translate text content between tags. Also preserve XML entities: &amp; &#160; etc.
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
}

export async function translateBatch(
  texts: string[],
  targetLang: string,
  langCode: string
): Promise<string[]> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('Google API key not configured. Set GOOGLE_API_KEY in environment.')
  }

  const prompt = buildSystemPrompt(targetLang, langCode)

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
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
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

  // Ensure correct length
  while (parsed.length < texts.length) {
    parsed.push(texts[parsed.length])
  }

  return parsed.slice(0, texts.length)
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

export function verifyTranslation(
  msgid: string,
  translated: string,
  index: number
): QAResult {
  const checks: QACheck[] = []

  // Check 1: Placeholder integrity
  const placeholderRegex = /%[dsfu]|%\([^)]+\)[dsfu]|\{[0-9]*\}/g
  const srcPlaceholders = new Set(msgid.match(placeholderRegex) || [])
  const tgtPlaceholders = new Set(translated.match(placeholderRegex) || [])
  const missing = [...srcPlaceholders].filter(p => !tgtPlaceholders.has(p))
  const extra = [...tgtPlaceholders].filter(p => !srcPlaceholders.has(p))

  checks.push({
    name: 'Placeholder Integrity',
    passed: missing.length === 0 && extra.length === 0,
    detail: missing.length ? `Missing: ${missing.join(', ')}` :
            extra.length ? `Extra: ${extra.join(', ')}` : 'OK',
  })

  // Check 2: Newline count
  const srcNewlines = (msgid.match(/\n/g) || []).length
  const tgtNewlines = (translated.match(/\n/g) || []).length
  checks.push({
    name: 'Newline Count',
    passed: srcNewlines === tgtNewlines,
    detail: `Source: ${srcNewlines}, Target: ${tgtNewlines}`,
  })

  // Check 3: Non-empty
  checks.push({
    name: 'Non-Empty',
    passed: translated.trim().length > 0,
    detail: translated.trim() ? 'OK' : 'Translation is empty',
  })

  // Check 4: Length ratio
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
