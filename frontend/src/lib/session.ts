/**
 * Pure session helpers for the /translate workflow.
 *
 * Every uploaded PO file starts a brand-new translation session: batch
 * numbering restarts at 0, entry statuses are recomputed from that file alone,
 * and no review state, format errors or confirmed counts carry over from a
 * previous upload. Keeping the logic here (instead of inside the component)
 * makes the reset contract testable.
 */

/** Strings per batch. Pagination inside one session follows this size. */
export const BATCH_SIZE = 10

export type EntryStatus = 'pending' | 'reviewing' | 'confirmed'

export interface TranslationEntry {
  index: number
  msgid: string
  msgstr: string
  msgctxt?: string
  flags: string[]
  occurrences: string[]
  tcomment?: string
  status: EntryStatus
}

/** Shape returned by POST /api/upload in `all_entries`. */
export interface UploadedPoEntry {
  index: number
  msgid: string
  msgstr: string
  msgctxt?: string
  flags: string[]
  occurrences: string[]
  tcomment?: string
}

/** Everything that belongs to one upload session and must reset on re-upload. */
export interface SessionState {
  entries: TranslationEntry[]
  currentBatch: number
  reviewMode: boolean
  expandedEntry: number | null
  formatErrors: Record<number, string>
  initialConfirmedCount: number
  initialUploadTimestamp: string
  originalBaseFilename: string
}

export function stripFilenameTimestamps(name: string): string {
  return name.replace(/-\d{4}-\d{2}-\d{2}-\d{6}/g, '')
}

export function formatSessionTimestamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
}

/**
 * Compute the starting status of every entry in a freshly uploaded PO file.
 *
 * - empty `msgstr`  → `pending`, so the AI generates the first draft
 * - `fuzzy` flag    → `pending` with the stale text dropped; a fuzzy
 *                     translation is a rejected draft, not a usable one
 * - otherwise       → `confirmed`, it is already a human translation
 *
 * Every entry in `all_entries` is returned — nothing eligible is filtered out.
 */
export function buildSessionEntries(uploaded: UploadedPoEntry[]): TranslationEntry[] {
  return uploaded.map(e => {
    const flags = e.flags || []
    const isFuzzy = flags.includes('fuzzy')
    const hasText = typeof e.msgstr === 'string' && e.msgstr.trim().length > 0

    if (isFuzzy) {
      return { ...e, flags, msgstr: '', status: 'pending' as const }
    }
    return { ...e, flags, status: hasText ? ('confirmed' as const) : ('pending' as const) }
  })
}

/** Empty state — the baseline every new session starts from. */
export function createInitialSessionState(): SessionState {
  return {
    entries: [],
    currentBatch: 0,
    reviewMode: false,
    expandedEntry: null,
    formatErrors: {},
    initialConfirmedCount: 0,
    initialUploadTimestamp: '',
    originalBaseFilename: '',
  }
}

/**
 * Build a completely fresh session for one uploaded PO file. Calling this for
 * a second upload always yields independent state, so re-uploading the same
 * file creates a new session rather than resuming the previous one.
 */
export function buildFreshSession(
  uploaded: UploadedPoEntry[],
  filename: string,
  now: Date = new Date(),
): SessionState {
  const entries = buildSessionEntries(uploaded)
  return {
    ...createInitialSessionState(),
    entries,
    initialConfirmedCount: entries.filter(e => e.status === 'confirmed').length,
    originalBaseFilename: stripFilenameTimestamps((filename || 'messages.po').replace(/\.po$/, '')),
    initialUploadTimestamp: formatSessionTimestamp(now),
  }
}

/**
 * Apply AI draft translations onto the live entry list.
 *
 * Only `pending` entries are touched: human edits (`reviewing` with changed
 * text) and confirmed translations are never overwritten by a draft.
 */
export function applyDraftTranslations(
  prev: TranslationEntry[],
  translationMap: Map<number, string>,
): TranslationEntry[] {
  if (translationMap.size === 0) return prev

  return prev.map(entry => {
    const translated = translationMap.get(entry.index)
    if (translated === undefined || entry.status !== 'pending') return entry
    return { ...entry, msgstr: translated, status: 'reviewing' as const }
  })
}

/** Split a list of indexes into API-sized chunks. */
export function chunkIds(ids: number[], size: number = BATCH_SIZE): number[][] {
  const chunks: number[][] = []
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size))
  return chunks
}

export interface StatusCounts {
  total: number
  pending: number
  reviewing: number
  confirmed: number
}

/** Counts used by the progress bar and the header readouts. */
export function countByStatus(entries: TranslationEntry[]): StatusCounts {
  const counts: StatusCounts = { total: entries.length, pending: 0, reviewing: 0, confirmed: 0 }
  for (const e of entries) {
    if (e.status === 'confirmed') counts.confirmed++
    else if (e.status === 'reviewing') counts.reviewing++
    else counts.pending++
  }
  return counts
}

/**
 * After a batch is fully confirmed, find the next batch that still holds a
 * non-confirmed entry. Returns `totalBatches` when every batch is done.
 */
export function findBatchToAdvance(
  entries: TranslationEntry[],
  currentBatch: number,
  batchSize: number = BATCH_SIZE,
): number {
  const totalBatches = Math.ceil(entries.length / batchSize)
  let nextBatch = currentBatch + 1
  while (nextBatch < totalBatches) {
    const start = nextBatch * batchSize
    const batch = entries.slice(start, start + batchSize)
    if (batch.some(e => e.status !== 'confirmed')) break
    nextBatch++
  }
  return nextBatch
}

/** Indexes still waiting for an AI draft in a snapshot of the session. */
export function pendingDraftIndexes(entries: TranslationEntry[]): number[] {
  return entries
    .filter(e => e.status === 'pending' && e.msgid.trim().length > 0)
    .map(e => e.index)
}
