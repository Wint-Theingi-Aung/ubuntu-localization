// ═══════════════════════════════════════════════════════════════════
// REVIEW HISTORY — LocalStorage-backed glossary review log
// ═══════════════════════════════════════════════════════════════════

export interface ReviewHistoryEntry {
  id: string
  timestamp: number
  termEn: string
  action: 'approved' | 'rejected'
  reviewerNote?: string
}

const STORAGE_KEY = 'ubuntu-localization-review-history'
const MAX_ENTRIES = 100

/** Read all review history entries (newest first) */
export function getReviewHistory(): ReviewHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const entries: ReviewHistoryEntry[] = JSON.parse(raw)
    return entries.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}

/** Append a new review decision to history */
export function addReviewHistory(entry: Omit<ReviewHistoryEntry, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return
  try {
    const existing = getReviewHistory()
    const newEntry: ReviewHistoryEntry = {
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

/** Clear all review history */
export function clearReviewHistory() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
