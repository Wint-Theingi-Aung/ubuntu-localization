/**
 * Upload session lifecycle.
 *
 * Every uploaded PO file is a brand new session: no batch number, translation,
 * review state, confirmed count or progress carries over from the previous
 * file, and every eligible string gets a draft slot in the interface.
 */

import {
  BATCH_SIZE,
  applyDraftTranslations,
  buildFreshSession,
  buildSessionEntries,
  chunkIds,
  confirmableCount,
  countByStatus,
  countUntranslated,
  createInitialSessionState,
  findBatchToAdvance,
  pendingDraftIndexes,
  type UploadedPoEntry,
} from '../src/lib/session'
import { canReviewBatch, isReviewEligible } from '../src/lib/translate'

const entry = (index: number, msgstr = '', flags: string[] = []): UploadedPoEntry => ({
  index,
  msgid: `Source ${index}`,
  msgstr,
  flags,
  occurrences: [`file.c:${index}`],
})

const poFile = (n: number, msgstr?: (i: number) => string): UploadedPoEntry[] =>
  Array.from({ length: n }, (_, i) => entry(i, msgstr ? msgstr(i) : ''))

describe('buildSessionEntries — starting status for a fresh upload', () => {
  it('marks strings with no translation as pending so the AI drafts them', () => {
    const entries = buildSessionEntries(poFile(3))
    expect(entries).toHaveLength(3)
    expect(entries.every(e => e.status === 'pending')).toBe(true)
    expect(pendingDraftIndexes(entries)).toEqual([0, 1, 2])
  })

  it('keeps an existing human translation confirmed', () => {
    const entries = buildSessionEntries([
      entry(0, 'ကူးပြီး'),
      entry(1, ''),
    ])
    expect(entries[0].status).toBe('confirmed')
    expect(entries[1].status).toBe('pending')
    expect(pendingDraftIndexes(entries)).toEqual([1])
  })

  it('sends fuzzy entries back for a fresh AI draft instead of trusting stale text', () => {
    const entries = buildSessionEntries([
      entry(0, 'ဟောင်းနွှားသော ဘာသာပြန်', ['fuzzy']),
      entry(1, 'ကူးပြီး', ['fuzzy']),
    ])
    expect(entries.every(e => e.status === 'pending')).toBe(true)
    expect(entries.every(e => e.msgstr === '')).toBe(true)
    expect(pendingDraftIndexes(entries)).toEqual([0, 1])
  })

  it('returns every entry so no eligible string is dropped from the interface', () => {
    const uploaded = poFile(25)
    const entries = buildSessionEntries(uploaded)
    expect(entries.map(e => e.index)).toEqual(uploaded.map(e => e.index))
    expect(entries.map(e => e.msgid)).toEqual(uploaded.map(e => e.msgid))
  })

  it('keeps entry metadata (occurrences, msgctxt, tcomment) intact', () => {
    const entries = buildSessionEntries([
      { ...entry(0), msgctxt: 'partition', tcomment: 'shown at boot' },
    ])
    expect(entries[0].msgctxt).toBe('partition')
    expect(entries[0].tcomment).toBe('shown at boot')
    expect(entries[0].occurrences).toEqual(['file.c:0'])
  })
})

describe('buildFreshSession — a new upload never reuses the previous session', () => {
  const first = () => buildFreshSession(poFile(12, i => (i < 5 ? 'T' : '')), 'messages.po', new Date('2026-10-25T10:00:00'))

  it('starts batch 1 from the beginning with no leftover state', () => {
    const s = first()
    expect(s.currentBatch).toBe(0)
    expect(s.reviewMode).toBe(false)
    expect(s.expandedEntry).toBeNull()
    expect(s.formatErrors).toEqual({})
    expect(s.initialUploadTimestamp).toBe('2026-10-25-100000')
    expect(s.originalBaseFilename).toBe('messages')
  })

  it('re-uploading the same PO file creates an independent fresh session', () => {
    const a = first()
    const b = buildFreshSession(poFile(12, i => (i < 5 ? 'T' : '')), 'messages.po', new Date('2026-10-25T11:00:00'))

    // Same content, brand-new state objects.
    expect(b.entries).not.toBe(a.entries)
    expect(b.formatErrors).toEqual({})
    expect(b.currentBatch).toBe(0)
    expect(b.reviewMode).toBe(false)
    expect(b.initialUploadTimestamp).toBe('2026-10-25-110000')

    // Mutating the new session cannot touch the old one.
    b.entries[0].msgstr = 'changed'
    b.entries[0].status = 'reviewing'
    expect(a.entries[0].msgstr).toBe('T')
    expect(a.entries[0].status).toBe('confirmed')
  })

  it('a second, different PO file discards the first file’s progress', () => {
    const sessionOne = first()
    // Session one has made progress: batch moved on, errors recorded.
    sessionOne.currentBatch = 1
    sessionOne.formatErrors[3] = 'Missing: %s'
    sessionOne.reviewMode = true

    const sessionTwo = buildFreshSession(poFile(4), 'other.po', new Date('2026-10-25T12:00:00'))

    expect(sessionTwo.currentBatch).toBe(0)
    expect(sessionTwo.formatErrors).toEqual({})
    expect(sessionTwo.reviewMode).toBe(false)
    expect(sessionTwo.entries).toHaveLength(4)
    expect(sessionTwo.entries.map(e => e.msgid)).toEqual(['Source 0', 'Source 1', 'Source 2', 'Source 3'])
    expect(sessionTwo.initialConfirmedCount).toBe(0)
    expect(sessionTwo.originalBaseFilename).toBe('other')
  })

  it('counts only pre-existing human translations as initially confirmed', () => {
    const s = buildFreshSession(poFile(6, i => (i < 4 ? 'T' : '')), 'messages.po')
    expect(countByStatus(s.entries)).toEqual({ total: 6, pending: 2, reviewing: 0, confirmed: 4 })
    expect(s.initialConfirmedCount).toBe(4)
  })

  it('resetting to the upload step returns an empty session', () => {
    const initial = createInitialSessionState()
    expect(initial).toEqual({
      entries: [],
      currentBatch: 0,
      reviewMode: false,
      expandedEntry: null,
      formatErrors: {},
      initialConfirmedCount: 0,
      initialUploadTimestamp: '',
      originalBaseFilename: '',
    })
  })
})

describe('applyDraftTranslations — AI drafts never overwrite human work', () => {
  const base = () => [
    { ...entry(0), msgstr: '', status: 'pending' as const },
    { ...entry(1), msgstr: 'human edit', status: 'reviewing' as const },
    { ...entry(2), msgstr: 'confirmed', status: 'confirmed' as const },
    { ...entry(3), msgstr: '', status: 'pending' as const },
  ]

  it('fills pending entries and moves them to reviewing', () => {
    const next = applyDraftTranslations(base(), new Map([[0, 'draft 0'], [3, 'draft 3']]))
    expect(next[0]).toMatchObject({ msgstr: 'draft 0', status: 'reviewing' })
    expect(next[3]).toMatchObject({ msgstr: 'draft 3', status: 'reviewing' })
  })

  it('does not touch a human-edited or confirmed translation', () => {
    const next = applyDraftTranslations(base(), new Map([
      [1, 'AI would clobber this'],
      [2, 'AI would clobber this too'],
    ]))
    expect(next[1].msgstr).toBe('human edit')
    expect(next[1].status).toBe('reviewing')
    expect(next[2].msgstr).toBe('confirmed')
    expect(next[2].status).toBe('confirmed')
  })

  it('leaves the list untouched when the AI returned nothing', () => {
    const prev = base()
    const next = applyDraftTranslations(prev, new Map<number, string>())
    expect(next).toBe(prev)
  })
})

describe('progress and batch navigation', () => {
  it('counts AI drafts separately from confirmed translations', () => {
    const entries = buildSessionEntries(poFile(10, i => (i < 3 ? 'T' : '')))
    const withDrafts = applyDraftTranslations(entries, new Map([[3, 'draft'], [4, 'draft']]))
    const counts = countByStatus(withDrafts)

    expect(counts.total).toBe(10)
    expect(counts.confirmed).toBe(3)   // only the pre-existing human ones
    expect(counts.reviewing).toBe(2)   // AI drafts awaiting review
    expect(counts.pending).toBe(5)
  })

  it('batch navigation keeps the BATCH_SIZE slice behaviour', () => {
    expect(BATCH_SIZE).toBe(10)
    const entries = buildSessionEntries(poFile(25))
    expect(chunkIds(pendingDraftIndexes(entries), BATCH_SIZE).map(c => c.length))
      .toEqual([10, 10, 5])
  })

  it('advances to the next incomplete batch, skipping fully confirmed ones', () => {
    const entries = buildSessionEntries(poFile(30))
    // First batch confirmed by the human, second batch still open.
    for (const e of entries.slice(0, 10)) e.status = 'confirmed'
    expect(findBatchToAdvance(entries, 0, BATCH_SIZE)).toBe(1)

    // Second batch confirmed too.
    for (const e of entries.slice(10, 20)) e.status = 'confirmed'
    expect(findBatchToAdvance(entries, 1, BATCH_SIZE)).toBe(2)
  })

  it('reports completion once every batch is confirmed', () => {
    const entries = buildSessionEntries(poFile(25))
    entries.forEach(e => { e.status = 'confirmed' })
    expect(findBatchToAdvance(entries, 2, BATCH_SIZE)).toBe(3) // totalBatches === 3
  })
})

describe('review is available before every batch is fully translated', () => {
  it('opens when only one string of the batch has a draft', () => {
    const entries = buildSessionEntries(poFile(10))
    const drafted = applyDraftTranslations(entries, new Map([[4, 'draft 4']]))
    const batch = drafted.slice(0, 10)

    expect(canReviewBatch(batch)).toBe(true)
    expect(batch.filter(isReviewEligible)).toHaveLength(1)
  })

  it('stays closed while the batch still has nothing to review', () => {
    const batch = buildSessionEntries(poFile(10))
    expect(canReviewBatch(batch)).toBe(false)
  })
})

describe('chunkIds', () => {
  it('splits without dropping or duplicating an index', () => {
    const ids = Array.from({ length: 23 }, (_, i) => i)
    const chunks = chunkIds(ids, 10)
    expect(chunks).toEqual([
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      [20, 21, 22],
    ])
    expect(chunks.flat().sort((a, b) => a - b)).toEqual(ids)
  })

  it('returns nothing for an empty list', () => {
    expect(chunkIds([], BATCH_SIZE)).toEqual([])
  })
})

describe('countUntranslated — the only progress figure the header shows', () => {
  it('counts every string of a fresh upload', () => {
    expect(countUntranslated(buildSessionEntries(poFile(1303)))).toBe(1303)
  })

  it('drops by exactly the strings a completed batch produced', () => {
    const entries = buildSessionEntries(poFile(25))
    const drafted = applyDraftTranslations(entries, new Map(
      Array.from({ length: 10 }, (_, i) => [i, `draft ${i}`]) as Array<[number, string]>
    ))
    expect(countUntranslated(entries)).toBe(25)
    expect(countUntranslated(drafted)).toBe(15)
  })

  it('never counts a translation that is already in the file', () => {
    const entries = buildSessionEntries(poFile(5, i => (i < 3 ? `T${i}` : '')))
    expect(countUntranslated(entries)).toBe(2)
  })

  it('counts a translation the user emptied by hand as remaining', () => {
    const entries = buildSessionEntries(poFile(3, () => 'T'))
    entries[1] = { ...entries[1], msgstr: '   ', status: 'reviewing' as const }
    expect(countUntranslated(entries)).toBe(1)
  })

  it('ignores strings that only hold a draft awaiting review', () => {
    const entries = buildSessionEntries(poFile(10))
    const drafted = applyDraftTranslations(entries, new Map([[0, 'draft 0']]))
    expect(countUntranslated(drafted)).toBe(9)
  })
})

describe('confirmableCount — keeps a zero count off the screen', () => {
  const batch = (statuses: Array<[string, string]>) =>
    statuses.map(([status, msgstr], i) => ({
      ...entry(i, msgstr),
      status: status as 'pending' | 'reviewing' | 'confirmed',
    }))

  it('is zero when the batch still holds only untranslated strings', () => {
    expect(confirmableCount(batch(Array.from({ length: 10 }, () => ['pending', ''])), {})).toBe(0)
  })

  it('is zero for a batch that is already confirmed apart from pending strings', () => {
    // 7 confirmed + 3 not translated: nothing to confirm, so no button at all.
    const statuses = [
      ...Array.from({ length: 7 }, () => ['confirmed', 'T'] as [string, string]),
      ...Array.from({ length: 3 }, () => ['pending', ''] as [string, string]),
    ]
    expect(confirmableCount(batch(statuses), {})).toBe(0)
  })

  it('counts only the entries awaiting review', () => {
    const statuses = [
      ...Array.from({ length: 7 }, () => ['confirmed', 'T'] as [string, string]),
      ...Array.from({ length: 3 }, () => ['reviewing', 'T'] as [string, string]),
    ]
    expect(confirmableCount(batch(statuses), {})).toBe(3)
  })

  it('excludes entries whose format specifiers do not match', () => {
    const statuses = Array.from({ length: 4 }, () => ['reviewing', 'T'] as [string, string])
    expect(confirmableCount(batch(statuses), { 1: 'Missing: %d' })).toBe(3)
  })

  it('excludes a confirmed entry that still carries a format error', () => {
    const statuses: Array<[string, string]> = [['confirmed', 'T'], ['reviewing', 'T']]
    expect(confirmableCount(batch(statuses), { 0: 'Missing: %s' })).toBe(1)
  })

  it('is zero when every entry awaiting review needs a format fix', () => {
    const statuses = Array.from({ length: 3 }, () => ['reviewing', 'T'] as [string, string])
    expect(confirmableCount(batch(statuses), { 0: 'x', 1: 'x', 2: 'x' })).toBe(0)
  })
})
