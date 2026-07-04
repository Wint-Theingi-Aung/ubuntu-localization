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
  total: number
  translated: number
  untranslated: number
  completionPct: number
}

interface LaunchpadEntry {
  name: string
  message_count?: number
  translated_count_overview?: Record<string, number>
  web_link?: string
}

// ── Launchpad REST API helpers ────────────────────────────────────────
const LP_API = 'https://api.launchpad.net/devel'

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

/**
 * Fetch all translation templates for the stonking series from Launchpad.
 * Launchpad paginates at ~50 results; we follow next_collection_link.
 */
async function fetchAllTemplates(): Promise<LaunchpadEntry[]> {
  const entries: LaunchpadEntry[] = []
  // Try the distribution translation templates endpoint
  let url = `${LP_API}/ubuntu/+translation-templates?ws.size=100&ws.op=getId`

  // Fallback: try via the series
  const seriesUrl = `${LP_API}/ubuntu/${UBUNTU_RELEASE}/+translation-templates?ws.size=100`

  let currentUrl: string | null = url
  let attempts = 0

  interface TemplatePage {
    start?: number
    total_size?: number
    entries?: LaunchpadEntry[]
    next_collection_link?: string
  }

  while (currentUrl && attempts < 20) {
    attempts++
    const fetchUrl: string = currentUrl
    const data = await fetchJson<TemplatePage>(fetchUrl)

    if (!data) {
      // Try the series endpoint as fallback on first failure
      if (attempts === 1) {
        currentUrl = seriesUrl
        continue
      }
      break
    }

    if (data.entries) {
      entries.push(...data.entries)
    }

    // Check if there are more pages
    if (data.next_collection_link && entries.length < (data.total_size || Infinity)) {
      currentUrl = data.next_collection_link
    } else {
      break
    }
  }

  return entries
}

/**
 * For a given template, try to get per-language PO file stats.
 * This is a secondary fetch that may not be available for all templates.
 */
async function fetchTemplateStats(
  templateName: string,
  langCode: string
): Promise<{ translated: number; untranslated: number } | null> {
  // Try to get the PO file stats from the template's translation files
  const url = `${LP_API}/ubuntu/${UBUNTU_RELEASE}/+source/${templateName}/+pots/${templateName}/${langCode}/+translate`
  // The translate page doesn't return JSON stats directly.
  // Instead, try the distribution translation file endpoint
  const poUrl = `${LP_API}/ubuntu/${UBUNTU_RELEASE}/+translation-templates?ws.size=1&ws.op=getId&name=${templateName}`

  const data = await fetchJson<{ entries?: LaunchpadEntry[] }>(poUrl)
  if (data?.entries?.[0]) {
    const entry = data.entries[0]
    const langStats = entry.translated_count_overview?.[langCode]
    if (langStats !== undefined) {
      const total = entry.message_count || 0
      return {
        translated: langStats,
        untranslated: total - langStats,
      }
    }
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
    const rawTemplates = await fetchAllTemplates()

    if (rawTemplates.length === 0) {
      // Launchpad API unreachable or no data — return empty gracefully
      return NextResponse.json({
        lang,
        templates: [],
        cached: false,
        note: 'Launchpad API unavailable. Metrics will show as N/A.',
      })
    }

    // Build the metrics array
    const templates: TranslationTemplate[] = rawTemplates.map((t) => {
      const total = t.message_count || 0
      const langStats = t.translated_count_overview?.[lang]
      const translated = langStats !== undefined ? langStats : 0
      const untranslated = total - translated
      const completionPct = total > 0 ? Math.round((translated / total) * 100) : 0

      return {
        name: t.name,
        total,
        translated,
        untranslated,
        completionPct,
      }
    })

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
