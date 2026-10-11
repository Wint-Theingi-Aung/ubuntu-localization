/**
 * Tests for partial-batch review eligibility.
 *
 * A batch of 10 strings may be partially translated: untranslated strings stay
 * empty and are skipped, never treated as completed translations. Review opens
 * as soon as at least one string is translated; it stays closed when all are
 * empty.
 */

import { isReviewEligible, canReviewBatch, validateBatchResponse } from '../src/lib/translate'

const entry = (status: string, msgstr: string) => ({ status, msgstr })

describe('isReviewEligible', () => {
  it('accepts a reviewing entry with a translation', () => {
    expect(isReviewEligible(entry('reviewing', 'Translated text'))).toBe(true)
  })

  it('accepts a confirmed entry with a translation', () => {
    expect(isReviewEligible(entry('confirmed', 'Confirmed text'))).toBe(true)
  })

  it('rejects a pending entry even if it holds text', () => {
    expect(isReviewEligible(entry('pending', 'Power Off'))).toBe(false)
  })

  it('rejects an empty translation', () => {
    expect(isReviewEligible(entry('reviewing', ''))).toBe(false)
    expect(isReviewEligible(entry('confirmed', ''))).toBe(false)
  })

  it('rejects a whitespace-only translation', () => {
    expect(isReviewEligible(entry('reviewing', '   \n  '))).toBe(false)
  })
})

describe('canReviewBatch', () => {
  const ten = (overrides: Record<number, { status: string; msgstr: string }> = {}) =>
    Array.from({ length: 10 }, (_, i) => overrides[i] ?? entry('pending', ''))

  it('is unavailable when all 10 strings are empty', () => {
    expect(canReviewBatch(ten())).toBe(false)
  })

  it('is unavailable for an empty batch', () => {
    expect(canReviewBatch([])).toBe(false)
  })

  it('is available when all 10 strings are translated', () => {
    const batch = ten(Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [i, entry('reviewing', `T${i}`)])
    ))
    expect(canReviewBatch(batch)).toBe(true)
  })

  it('is available when only 1 of 10 strings is translated', () => {
    const batch = ten({ 7: entry('reviewing', 'T7') })
    expect(canReviewBatch(batch)).toBe(true)
  })

  it('is available when 9 of 10 strings are translated and one is skipped', () => {
    const batch = ten(Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [i, entry('confirmed', `T${i}`)])
    ))
    expect(canReviewBatch(batch)).toBe(true)
  })

  it('is unavailable when the only translated string is whitespace', () => {
    const batch = ten({ 0: entry('reviewing', '  ') })
    expect(canReviewBatch(batch)).toBe(false)
  })

  it('excludes skipped strings from the reviewable list', () => {
    const batch = ten({
      0: entry('confirmed', 'T0'),
      1: entry('reviewing', 'T1'),
      2: entry('reviewing', ''),
      3: entry('pending', ''),
    })
    const reviewable = batch.filter(isReviewEligible)
    expect(reviewable.map(e => e.msgstr)).toEqual(['T0', 'T1'])
  })

  it('survives a reset string without discarding saved translations', () => {
    const batch = ten(Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [i, entry('confirmed', `T${i}`)])
    ))
    // User resets the long string at index 4 back to pending.
    batch[4] = entry('pending', '')
    const reviewable = batch.filter(isReviewEligible)
    expect(reviewable).toHaveLength(9)
    expect(reviewable.find(e => e.msgstr === 'T4')).toBeUndefined()
    expect(reviewable.some(e => e.msgstr === 'T3')).toBe(true)
    expect(reviewable.some(e => e.msgstr === 'T5')).toBe(true)
  })
})

describe('validateBatchResponse with partial batches', () => {
  it('accepts a response covering only the subset that was requested', () => {
    // Frontend sends only the pending subset of a batch of 10.
    const requested = [4, 7]
    const response = [
      { index: 4, translated: 'T4' },
      { index: 7, translated: 'T7' },
    ]
    const result = validateBatchResponse(response, requested)
    expect(result.ok).toBe(true)
    expect(result.translationMap!.size).toBe(2)
  })

  it('does not require the skipped indexes to be present', () => {
    const requested = [0]
    const result = validateBatchResponse([{ index: 0, translated: 'T0' }], requested)
    expect(result.ok).toBe(true)
  })

  it('still rejects a subset response with an empty translation', () => {
    const requested = [4, 7]
    const response = [
      { index: 4, translated: 'T4' },
      { index: 7, translated: '' },
    ]
    const result = validateBatchResponse(response, requested)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Empty translation')
  })
})
