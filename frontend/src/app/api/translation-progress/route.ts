import { NextRequest, NextResponse } from 'next/server'
import { UBUNTU_RELEASE } from '@/lib/constants'

// ── Cache ─────────────────────────────────────────────────────────────
interface CacheEntry {
  data: TranslationTemplate[]
  fetchedAt: number
}
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// ── In-flight refresh tracking ───────────────────────────────────────
const refreshing = new Map<string, boolean>()

// ── Types ─────────────────────────────────────────────────────────────
export interface TranslationTemplate {
  name: string
  sourcePackage: string
  total: number
  translated: number
  untranslated: number
  completionPct: number
}

// ── Launchpad web scraping helpers ─────────────────────────────────────

/**
 * Scrape the Launchpad translation templates page to get per-template
 * total string counts. The Launchpad REST API no longer exposes
 * +translation-templates, so we parse the HTML directly.
 *
 * Returns a map of template name → { total, sourcePackage }
 */
async function scrapeTemplateTotals(): Promise<Map<string, { total: number; sourcePackage: string }>> {
  const result = new Map<string, { total: number; sourcePackage: string }>()
  const url = `https://translations.launchpad.net/ubuntu/${UBUNTU_RELEASE}/+templates`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Ubuntu-Localization-Tool/4.0' },
      next: { revalidate: 3600 }, // 1 hour cache at Next.js level
    })
    if (!res.ok) return result

    const html = await res.text()

    // Extract template names from links like: <a href="+source/.../+pots/TEMPLATE">TEMPLATE</a>
    const templateLinks = html.match(/<a href="\+source\/[^"]*\+pots\/([^"]+)">([^<]+)<\/a>/g) || []

    // Extract source packages from <td class="sourcepackage_column">PKG</td>
    const sourcePackages = html.match(/<td class="sourcepackage_column">([^<]+)<\/td>/g) || []

    // Extract lengths from <td class="length_column">NUM</td>
    const lengths = html.match(/<td class="length_column">([^<]+)<\/td>/g) || []

    // Parse the extracted HTML fragments
    const parseText = (s: string) => s.replace(/<[^>]*>/g, '').trim()

    const names = templateLinks.map(parseText)

    for (let i = 0; i < names.length; i++) {
      const name = names[i]
      const sourcePackage = i < sourcePackages.length ? parseText(sourcePackages[i]) : name
      const total = i < lengths.length ? parseInt(parseText(lengths[i]), 10) || 0 : 0

      if (name) {
        result.set(name, { total, sourcePackage })
      }
    }
  } catch {
    // Scraping failed — return empty, caller handles gracefully
  }

  return result
}

/**
 * Try to get per-language translation stats for a template by fetching
 * its +details page on Launchpad.
 *
 * Uses the +details endpoint which shows structured stats like:
 *   "140 (36.55%) translated"
 *   "243 (63.45%) untranslated"
 *   "383 messages"
 */
async function fetchTemplateLangStats(
  templateName: string,
  sourcePackage: string,
  langCode: string
): Promise<{ translated: number; untranslated: number; completionPct: number } | null> {
  const url = `https://translations.launchpad.net/ubuntu/${UBUNTU_RELEASE}/+source/${sourcePackage}/+pots/${templateName}/${langCode}/+details`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Ubuntu-Localization-Tool/4.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null

    const html = await res.text()

    // Strip HTML tags first for cleaner parsing
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

    // "Messages: N" or "N messages"
    const totalMatch = text.match(/Messages:\s*(\d[\d,]*)/i) ||
                       text.match(/(\d[\d,]*)\s+messages/i)
    // "Translated: N (XX%)" — number comes right after the label
    const translatedMatch = text.match(/Translated:\s*(\d[\d,]*)\s*\(/i) ||
                            text.match(/(\d[\d,]*)\s*\([^)]*\)\s*translated/i)
    // "Untranslated: N (XX%)"
    const untranslatedMatch = text.match(/Untranslated:\s*(\d[\d,]*)\s*\(/i) ||
                              text.match(/(\d[\d,]*)\s*\([^)]*\)\s*untranslated/i)

    if (totalMatch) {
      const total = parseInt(totalMatch[1].replace(/,/g, ''), 10) || 0
      const translated = translatedMatch
        ? parseInt(translatedMatch[1].replace(/,/g, ''), 10) || 0
        : 0
      const untranslated = untranslatedMatch
        ? parseInt(untranslatedMatch[1].replace(/,/g, ''), 10) || (total - translated)
        : total - translated
      const completionPct = total > 0 ? Math.round((translated / total) * 100) : 0
      return { translated, untranslated, completionPct }
    }
  } catch {
    // Fetch failed — return null
  }

  return null
}

/**
 * Run async tasks with a concurrency limit.
 */
async function pMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let idx = 0

  async function worker() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
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

  const cacheKey = `all-templates-${lang}`
  const cached = cache.get(cacheKey)

  // If cache is fresh, return immediately
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      lang,
      templates: cached.data,
      cached: true,
    })
  }

  // If already refreshing in background, return stale cache (if available) or wait
  if (refreshing.get(cacheKey)) {
    if (cached) {
      return NextResponse.json({ lang, templates: cached.data, cached: true, refreshing: true })
    }
    // No stale cache — must wait for first fetch
    // Fall through to fetch below
  }

  // Start background refresh
  refreshing.set(cacheKey, true)

  try {
    // Step 1: Scrape template names + total counts from the listing page (fast, single request)
    const totals = await scrapeTemplateTotals()

    if (totals.size === 0) {
      refreshing.delete(cacheKey)
      return NextResponse.json({
        lang,
        templates: cached?.data || [],
        cached: !!cached,
        note: 'Launchpad templates page unavailable. Metrics will show as N/A.',
      })
    }

    // Step 2: Fetch per-language stats for ALL templates in parallel
    const entries = Array.from(totals.entries())
    const CONCURRENCY = 15 // increased parallel requests

    const langStatsResults = await pMap(
      entries,
      ([name, { sourcePackage }]) => fetchTemplateLangStats(name, sourcePackage, lang),
      CONCURRENCY
    )

    const templates: TranslationTemplate[] = entries.map(([name, { total, sourcePackage }], i) => {
      const langStats = langStatsResults[i]
      if (langStats) {
        return {
          name,
          sourcePackage,
          total: langStats.translated + langStats.untranslated,
          translated: langStats.translated,
          untranslated: langStats.untranslated,
          completionPct: langStats.completionPct,
        }
      }
      // No per-language stats — use total only
      return {
        name,
        sourcePackage,
        total,
        translated: 0,
        untranslated: total,
        completionPct: 0,
      }
    })

    // Update cache
    cache.set(cacheKey, { data: templates, fetchedAt: Date.now() })
    refreshing.delete(cacheKey)

    return NextResponse.json({
      lang,
      templates,
      cached: false,
    })
  } catch (error) {
    console.error('Translation progress fetch error:', error)
    refreshing.delete(cacheKey)
    return NextResponse.json({
      lang,
      templates: cached?.data || [],
      cached: !!cached,
      error: 'Failed to fetch translation metrics from Launchpad',
    })
  }
}
