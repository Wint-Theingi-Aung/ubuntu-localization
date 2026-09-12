// ═══════════════════════════════════════════════════════════════════
// HISTORY — LocalStorage-backed activity log
// ═══════════════════════════════════════════════════════════════════

export interface HistoryEntry {
  id: string
  timestamp: number
  /** User identifier — undefined for local (no-auth) actions; set by authenticated sessions */
  user?: string
  action: 'translate' | 'export' | 'upload' | 'glossary'
  /** Plain-text fallback (English) — used when no descriptionKey is set, or for old localStorage entries */
  description: string
  /** i18n key for the description (supports {param} interpolation via ti()) */
  descriptionKey?: string
  /** Parameters to interpolate into the description key */
  descriptionParams?: Record<string, string | number>
  language?: string
  /** Plain-text fallback for details */
  details?: string
  /** i18n key for the details line */
  detailsKey?: string
  /** Parameters to interpolate into the details key */
  detailsParams?: Record<string, string | number>
}

const STORAGE_KEY = 'ubuntu-localization-history'
const MAX_ENTRIES = 100

/** Infer descriptionKey/detailsKey from plain English description for legacy entries */
function inferI18nKeys(entry: HistoryEntry): HistoryEntry {
  if (entry.descriptionKey) return entry // already has i18n keys
  const d = entry.description
  const det = entry.details || ''
  let descriptionKey: string | undefined
  let descriptionParams: Record<string, string | number> | undefined
  let detailsKey: string | undefined
  let detailsParams: Record<string, string | number> | undefined

  // description patterns
  const translatedMatch = d.match(/^Translated (\d+) strings? in (.+)$/)
  if (translatedMatch) {
    descriptionKey = 'activity_translated_n'
    descriptionParams = { count: Number(translatedMatch[1]), file: translatedMatch[2] }
  }
  const translatedWithAi = d.match(/^Translated (\d+) strings? with AI$/)
  if (translatedWithAi) {
    descriptionKey = 'activity_translated_n'
    descriptionParams = { count: Number(translatedWithAi[1]), file: entry.language || 'demo' }
  }
  if (!descriptionKey && /^Exported translated/.test(d)) {
    const file = d.replace(/^Exported translated\s*/, '')
    descriptionKey = 'activity_exported_file'
    descriptionParams = { file }
  }
  if (!descriptionKey && /^Uploaded/.test(d)) {
    const file = d.replace(/^Uploaded\s*/, '').replace(/\s*for translation$/, '')
    descriptionKey = 'activity_uploaded_file'
    descriptionParams = { file }
  }
  const glossaryMatch = d.match(/^Added (\d+) glossary terms?$/)
  if (!descriptionKey && glossaryMatch) {
    descriptionKey = 'activity_added_glossary_n'
    descriptionParams = { count: Number(glossaryMatch[1]) }
  }

  // details patterns
  if (/AI batch translation/.test(det)) {
    detailsKey = 'activity_ai_batch'
  } else if (/^Manual translation$/.test(det)) {
    detailsKey = 'activity_manual'
  }
  const newTransMatch = det.match(/^\+?(\d+) new translations, completion: (\d+)%$/)
  if (newTransMatch) {
    detailsKey = 'activity_new_translations'
    detailsParams = { count: Number(newTransMatch[1]), percent: Number(newTransMatch[2]) }
  }
  const entriesMatch = det.match(/^([\d,]+) entries, ([\d,]+) untranslated$/)
  if (entriesMatch) {
    detailsKey = 'activity_entries_n'
    detailsParams = { count: Number(entriesMatch[1].replace(/,/g, '')), untranslated: Number(entriesMatch[2].replace(/,/g, '')) }
  }
  if (!detailsKey && det && !det.includes('{')) {
    // Generic details — use glossary_detail key if it looks like terms
    detailsKey = 'activity_glossary_detail'
    detailsParams = { terms: det }
  }

  return { ...entry, descriptionKey, descriptionParams, detailsKey, detailsParams }
}

/** Read all history entries from localStorage (newest first) */
export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const entries: HistoryEntry[] = JSON.parse(raw)
    // Migrate legacy entries: infer i18n keys from plain English descriptions
    const migrated = entries.map(inferI18nKeys)
    // Persist migration so we only do this once
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)) } catch {}
    return migrated.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

/** Append a new activity to history */
export function recordHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return
  try {
    const existing = getHistory()
    const newEntry: HistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    }
    const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/** Clear all history */
export function clearHistory() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/** Format a timestamp for display with i18n support */
export function formatTimestamp(ts: number, t?: (key: string, fallback?: string) => string): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return t ? t('history_time_just_now', 'Just now') : 'Just now'
  if (mins < 60) return `${mins}${t ? t('history_time_minutes_ago', 'm ago') : 'm ago'}`
  if (hours < 24) return `${hours}${t ? t('history_time_hours_ago', 'h ago') : 'h ago'}`
  if (days < 7) return `${days}${t ? t('history_time_days_ago', 'd ago') : 'd ago'}`

  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
