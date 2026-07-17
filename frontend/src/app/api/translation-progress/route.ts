import { NextRequest, NextResponse } from 'next/server'
import { UBUNTU_RELEASE } from '@/lib/constants'

// ── Cache ─────────────────────────────────────────────────────────────
interface CacheEntry {
  data: TranslationTemplate[]
  fetchedAt: number
}
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// ── Types ─────────────────────────────────────────────────────────────
export interface TranslationTemplate {
  name: string
  sourcePackage: string
  total: number
  translated: number
  untranslated: number
  completionPct: number
}

// ── Launchpad helpers ─────────────────────────────────────────────────

/**
 * Fetch overall language stats from the main Launchpad translations page.
 * This is a SINGLE request that returns per-language untranslated counts
 * and percentages — much faster than per-template scraping (which times
 * out on Vercel due to 547+ individual requests).
 *
 * The page structure has rows like:
 *   <a href="+lang/my">Burmese</a> ... 81.39% untranslated ... 323977 untranslated
 *
 * Returns a map of lang code → { total, translated, untranslated, pct }
 */
async function fetchLanguageOverview(): Promise<
  Map<string, { total: number; translated: number; untranslated: number; pct: number }>
> {
  const result = new Map<string, { total: number; translated: number; untranslated: number; pct: number }>()
  const url = `https://translations.launchpad.net/ubuntu/${UBUNTU_RELEASE}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Ubuntu-Localization-Tool/5.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return result

    const html = await res.text()

    // For each target language, find its row and extract stats.
    // Each row has sortkey spans: untranslated%, untranslated_count, need_review, changed, contributors
    const langCodes = ['my', 'shn', 'mnw', 'ksw']

    for (const langCode of langCodes) {
      // Find the language link position
      const linkIdx = html.indexOf(`+lang/${langCode}`)
      if (linkIdx === -1) continue

      // Extract the containing <tr>...</tr> by finding nearest tr boundaries
      const trStart = html.lastIndexOf('<tr', linkIdx)
      const trEnd = html.indexOf('</tr>', linkIdx)
      if (trStart === -1 || trEnd === -1) continue
      const row = html.substring(trStart, trEnd)

      // Extract untranslated percentage from the bar alt text
      // Format: alt=" 81.39% untranslated "
      const pctMatch = row.match(/alt="[^"]*?([\d.]+)%\s*untranslated/i)
      if (!pctMatch) continue
      const untranslatedPct = parseFloat(pctMatch[1])

      // Extract untranslated count from sortkey spans.
      // The row has sortkey spans in order: [untranslated%, untranslated_count, need_review, changed, contributors]
      const sortkeys = [...row.matchAll(/<span class="sortkey">([^<]+)<\/span>/g)]
        .map(m => m[1].trim())
      // sortkeys[0] = untranslated%, sortkeys[1] = untranslated count
      if (sortkeys.length < 2) continue

      const untranslated = parseInt(sortkeys[1].replace(/,/g, ''), 10) || 0

      if (untranslated > 0 || untranslatedPct > 0) {
        // Calculate total from untranslated count and percentage
        const translatedPct = 100 - untranslatedPct
        const total = untranslatedPct > 0
          ? Math.round(untranslated / (untranslatedPct / 100))
          : untranslated
        const translated = Math.round(total * (translatedPct / 100))
        const pct = Math.round(translatedPct * 10) / 10 // 1 decimal

        result.set(langCode, { total, translated, untranslated, pct })
      }
    }
  } catch {
    // Fetch failed — return empty, caller handles gracefully
  }

  return result
}

// ── API Route ─────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || 'my'

  const validLangs = ['my', 'shn', 'mnw', 'ksw']
  if (!validLangs.includes(lang)) {
    return NextResponse.json(
      { error: `Invalid lang. Supported: ${validLangs.join(', ')}` },
      { status: 400 }
    )
  }

  const cacheKey = `lang-overview`
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      lang,
      templates: cached.data.filter(t => t.name === `ubuntu-${lang}`),
      cached: true,
    })
  }

  try {
    const overview = await fetchLanguageOverview()

    if (overview.size === 0) {
      return NextResponse.json({
        lang,
        templates: cached?.data || [],
        cached: !!cached,
        note: 'Launchpad overview page unavailable.',
      })
    }

    // Convert overview stats into the TranslationTemplate format
    // Return a single "aggregate" entry per language
    const templates: TranslationTemplate[] = []

    for (const [langCode, stats] of overview.entries()) {
      templates.push({
        name: `ubuntu-${langCode}`,
        sourcePackage: 'ubuntu',
        total: stats.total,
        translated: stats.translated,
        untranslated: stats.untranslated,
        completionPct: stats.pct,
      })
    }

    // Cache ALL languages together
    cache.set(cacheKey, { data: templates, fetchedAt: Date.now() })

    // Return only the requested language's entry
    const langEntry = templates.find(t => t.name === `ubuntu-${lang}`)

    return NextResponse.json({
      lang,
      templates: langEntry ? [langEntry] : [],
      cached: false,
    })
  } catch (error) {
    console.error('Translation progress fetch error:', error)
    return NextResponse.json({
      lang,
      templates: cached?.data || [],
      cached: !!cached,
      error: 'Failed to fetch translation metrics from Launchpad',
    })
  }
}
