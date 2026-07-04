// ═══════════════════════════════════════════════════════════════════
// HISTORY — LocalStorage-backed activity log
// ═══════════════════════════════════════════════════════════════════

export interface HistoryEntry {
  id: string
  timestamp: number
  user: string
  action: 'translate' | 'export' | 'upload' | 'glossary'
  description: string
  language?: string
  details?: string
}

const STORAGE_KEY = 'ubuntu-localization-history'
const MAX_ENTRIES = 100

/** Read all history entries from localStorage (newest first) */
export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultHistory()
    const entries: HistoryEntry[] = JSON.parse(raw)
    return entries.sort((a, b) => b.timestamp - a.timestamp)
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
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/** Clear all history */
export function clearHistory() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/** Seed with default entries if no history exists */
function getDefaultHistory(): HistoryEntry[] {
  const now = Date.now()
  const hour = 3600000
  const defaults: HistoryEntry[] = [
    { id: 'seed-1', timestamp: now - 2 * hour, user: 'wint-theingi-aung', action: 'translate', description: 'Translated 150 strings in gnome-control-center.po', language: 'Myanmar', details: 'AI batch translation with Gemini' },
    { id: 'seed-2', timestamp: now - 3 * hour, user: 'wint-theingi-aung', action: 'export', description: 'Exported translated gnome-control-center.po', language: 'Myanmar', details: '+150 new translations, completion: 42%' },
    { id: 'seed-3', timestamp: now - 5 * hour, user: 'wint-theingi-aung', action: 'upload', description: 'Uploaded gnome-shell.po for translation', language: 'Myanmar', details: '1,890 entries, 520 untranslated' },
    { id: 'seed-4', timestamp: now - 24 * hour, user: 'gipsyhnh', action: 'translate', description: 'Translated 25 strings in nautilus.po', language: 'Shan', details: 'Manual translation' },
    { id: 'seed-5', timestamp: now - 28 * hour, user: 'wint-theingi-aung', action: 'glossary', description: 'Added 10 glossary terms', details: 'Network, Security, System terms' },
    { id: 'seed-6', timestamp: now - 40 * hour, user: 'htetminaung2018', action: 'translate', description: 'Translated 15 strings in firefox.po', language: 'Mon', details: 'Manual translation' },
    { id: 'seed-7', timestamp: now - 48 * hour, user: 'wint-theingi-aung', action: 'export', description: 'Exported translated nautilus.po', language: 'Myanmar', details: '+280 new translations, completion: 65%' },
    { id: 'seed-8', timestamp: now - 72 * hour, user: 'clementlefebvre', action: 'translate', description: 'Translated 8 strings in gnome-calculator.po', language: "S'gaw Karen", details: 'Manual translation' },
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
