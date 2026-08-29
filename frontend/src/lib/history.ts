// ═══════════════════════════════════════════════════════════════════
// HISTORY — LocalStorage-backed activity log
// ═══════════════════════════════════════════════════════════════════

export interface HistoryEntry {
  id: string
  timestamp: number
  user: string
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
const CLEARED_KEY = 'ubuntu-localization-history-cleared'
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
    if (!raw) {
      // Only seed defaults on fresh install (not after manual clear)
      const wasCleared = localStorage.getItem(CLEARED_KEY) === 'true'
      if (wasCleared) return []
      return getDefaultHistory()
    }
    const entries: HistoryEntry[] = JSON.parse(raw)
    // Migrate legacy entries: infer i18n keys from plain English descriptions
    const migrated = entries.map(inferI18nKeys)
    // Persist migration so we only do this once
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)) } catch {}
    return migrated.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return getDefaultHistory()
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
    localStorage.removeItem(CLEARED_KEY)
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/** Clear all history */
export function clearHistory() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.setItem(CLEARED_KEY, 'true')
}

/** Seed with default entries if no history exists */
function getDefaultHistory(): HistoryEntry[] {
  const now = Date.now()
  const hour = 3600000
  const defaults: HistoryEntry[] = [
    { id: 'seed-1', timestamp: now - 2 * hour, user: 'wint-theingi-aung', action: 'translate', description: 'Translated 150 strings in gnome-control-center.po', descriptionKey: 'activity_translated_n', descriptionParams: { count: 150, file: 'gnome-control-center.po' }, language: 'Burmese', details: 'AI batch translation with Gemini', detailsKey: 'activity_ai_batch' },
    { id: 'seed-2', timestamp: now - 3 * hour, user: 'wint-theingi-aung', action: 'export', description: 'Exported translated gnome-control-center.po', descriptionKey: 'activity_exported_file', descriptionParams: { file: 'gnome-control-center.po' }, language: 'Burmese', details: '+150 new translations, completion: 42%', detailsKey: 'activity_new_translations', detailsParams: { count: 150, percent: 42 } },
    { id: 'seed-3', timestamp: now - 5 * hour, user: 'wint-theingi-aung', action: 'upload', description: 'Uploaded gnome-shell.po for translation', descriptionKey: 'activity_uploaded_file', descriptionParams: { file: 'gnome-shell.po' }, language: 'Burmese', details: '1,890 entries, 520 untranslated', detailsKey: 'activity_entries_n', detailsParams: { count: 1890, untranslated: 520 } },
    { id: 'seed-4', timestamp: now - 24 * hour, user: 'gipsyhnh', action: 'translate', description: 'Translated 25 strings in nautilus.po', descriptionKey: 'activity_translated_n', descriptionParams: { count: 25, file: 'nautilus.po' }, language: 'Shan', details: 'Manual translation', detailsKey: 'activity_manual' },
    { id: 'seed-5', timestamp: now - 28 * hour, user: 'wint-theingi-aung', action: 'glossary', description: 'Added 10 glossary terms', descriptionKey: 'activity_added_glossary_n', descriptionParams: { count: 10 }, details: 'Network, Security, System terms', detailsKey: 'activity_glossary_detail', detailsParams: { terms: 'Network, Security, System' } },
    { id: 'seed-6', timestamp: now - 40 * hour, user: 'htetminaung2018', action: 'translate', description: 'Translated 15 strings in firefox.po', descriptionKey: 'activity_translated_n', descriptionParams: { count: 15, file: 'firefox.po' }, language: 'Mon', details: 'Manual translation', detailsKey: 'activity_manual' },
    { id: 'seed-7', timestamp: now - 48 * hour, user: 'wint-theingi-aung', action: 'export', description: 'Exported translated nautilus.po', descriptionKey: 'activity_exported_file', descriptionParams: { file: 'nautilus.po' }, language: 'Burmese', details: '+280 new translations, completion: 65%', detailsKey: 'activity_new_translations', detailsParams: { count: 280, percent: 65 } },
    { id: 'seed-8', timestamp: now - 72 * hour, user: 'clementlefebvre', action: 'translate', description: 'Translated 8 strings in gnome-calculator.po', descriptionKey: 'activity_translated_n', descriptionParams: { count: 8, file: 'gnome-calculator.po' }, language: "S'gaw Karen", details: 'Manual translation', detailsKey: 'activity_manual' },
  ]
  // Save defaults to localStorage so they persist
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)) } catch {}
  return defaults
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
