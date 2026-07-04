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
 * its individual PO file page on Launchpad.
 *
 * This is slow (per-template HTTP fetch), so we limit concurrency.
 */
async function fetchTemplateLangStats(
  templateName: string,
  sourcePackage: string,
  langCode: string
): Promise<{ translated: number; untranslated: number; completionPct: number } | null> {
  const url = `https://translations.launchpad.net/ubuntu/${UBUNTU_RELEASE}/+source/${sourcePackage}/+pots/${templateName}/${langCode}/+translate`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Ubuntu-Localization-Tool/4.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null

    const html = await res.text()

    // Look for stats in the page — Launchpad shows translated/untranslated counts
    // Pattern: "X messages translated" or similar in the progress bar area
    const translatedMatch = html.match(/(\d[\d,]*)\s+messages?\s+translated/i)
    const untranslatedMatch = html.match(/(\d[\d,]*)\s+messages?\s+untranslated/i)
    const totalMatch = html.match(/(\d[\d,]*)\s+total\s+messages?/i) ||
                       html.match(/of\s+(\d[\d,]*)\s+messages?/i)

    if (translatedMatch && totalMatch) {
      const translated = parseInt(translatedMatch[1].replace(/,/g, ''), 10) || 0
      const total = parseInt(totalMatch[1].replace(/,/g, ''), 10) || 0
      const untranslated = untranslatedMatch
        ? parseInt(untranslatedMatch[1].replace(/,/g, ''), 10) || (total - translated)
        : total - translated
      const completionPct = total > 0 ? Math.round((translated / total) * 100) : 0
      return { translated, untranslated, completionPct }
    }

    // Alternative: look for percentage in progress bar
    const pctMatch = html.match(/(\d+(?:\.\d+)?)\s*%\s*(?:translated|complete)/i)
    if (pctMatch && totalMatch) {
      const total = parseInt(totalMatch[1].replace(/,/g, ''), 10) || 0
      const completionPct = Math.round(parseFloat(pctMatch[1]))
      const translated = Math.round(total * completionPct / 100)
      return { translated, untranslated: total - translated, completionPct }
    }
  } catch {
    // Fetch failed — return null
  }

  return null
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

  // Check cache
  const cacheKey = `all-templates-${lang}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      lang,
      templates: cached.data,
      cached: true,
    })
  }

  try {
    // Step 1: Scrape template names + total counts from the listing page
    const totals = await scrapeTemplateTotals()

    if (totals.size === 0) {
      return NextResponse.json({
        lang,
        templates: [],
        cached: false,
        note: 'Launchpad templates page unavailable. Metrics will show as N/A.',
      })
    }

    // Step 2: Build templates with total counts (no per-lang stats yet)
    const templates: TranslationTemplate[] = []

    // For a manageable subset, try to fetch per-language stats
    // Limit to first 20 templates to avoid hammering Launchpad
    const entries = Array.from(totals.entries())
    const STATS_BATCH_SIZE = 20

    for (let i = 0; i < entries.length; i++) {
      const [name, { total, sourcePackage }] = entries[i]

      if (i < STATS_BATCH_SIZE) {
        // Try to get per-language stats
        const langStats = await fetchTemplateLangStats(name, sourcePackage, lang)
        if (langStats) {
          templates.push({
            name,
            sourcePackage,
            total: langStats.translated + langStats.untranslated,
            translated: langStats.translated,
            untranslated: langStats.untranslated,
            completionPct: langStats.completionPct,
          })
          continue
        }
      }

      // No per-language stats — use total only
      templates.push({
        name,
        sourcePackage,
        total,
        translated: 0,
        untranslated: total,
        completionPct: 0,
      })
    }

    // Update cache
    cache.set(cacheKey, { data: templates, fetchedAt: Date.now() })

    return NextResponse.json({
      lang,
      templates,
      cached: false,
    })
  } catch (error) {
    console.error('Translation progress fetch error:', error)
    return NextResponse.json({
      lang,
      templates: [],
      cached: false,
      error: 'Failed to fetch translation metrics from Launchpad',
    })
  }
}
