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

describe('validateBatchResponse in partial mode (allowPartial)', () => {
  const opts = { allowPartial: true }

  it('keeps the results that arrived and reports the ones that did not', () => {
    const requested = [0, 1, 2]
    const response = [
      { index: 0, translated: 'T0' },
      { index: 2, translated: 'T2' },
    ]
    const result = validateBatchResponse(response, requested, opts)
    expect(result.ok).toBe(true)
    expect(result.translationMap!.size).toBe(2)
    expect(result.translationMap!.get(0)).toBe('T0')
    expect(result.translationMap!.get(2)).toBe('T2')
    expect(result.failedIndexes).toEqual([1])
  })

  it('drops an empty translation without discarding its neighbours', () => {
    const requested = [0, 1, 2]
    const response = [
      { index: 0, translated: 'T0' },
      { index: 1, translated: '   ' },
      { index: 2, translated: 'T2' },
    ]
    const result = validateBatchResponse(response, requested, opts)
    expect(result.ok).toBe(true)
    expect([...result.translationMap!.keys()]).toEqual([0, 2])
    expect(result.failedIndexes).toEqual([1])
  })

  it('reports a shorter response as partial instead of rejecting it', () => {
    const requested = [0, 1, 2, 3, 4]
    const response = [
      { index: 0, translated: 'T0' },
      { index: 1, translated: 'T1' },
      { index: 2, translated: 'T2' },
      { index: 3, translated: 'T3' },
      { index: 4, translated: 'T4' },
    ]
    // Only four answers for five requests: the fifth stays pending.
    const result = validateBatchResponse(response.slice(0, 4), requested, opts)
    expect(result.ok).toBe(true)
    expect(result.translationMap!.size).toBe(4)
    expect(result.failedIndexes).toEqual([4])
  })

  it('still rejects an index that was never requested', () => {
    const requested = [0, 1]
    const response = [
      { index: 0, translated: 'T0' },
      { index: 99, translated: 'Wrong entry' },
    ]
    const result = validateBatchResponse(response, requested, opts)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Unexpected index 99')
  })

  it('still rejects duplicate indexes', () => {
    const requested = [0, 1]
    const response = [
      { index: 0, translated: 'T0' },
      { index: 0, translated: 'Duplicate' },
    ]
    const result = validateBatchResponse(response, requested, opts)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Duplicate indexes')
  })

  it('still rejects a malformed result object', () => {
    const result = validateBatchResponse([{ index: 0 }], [0], opts)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Invalid translation result object')
  })

  it('applies nothing when no usable translation came back', () => {
    const requested = [0, 1]
    const response = [
      { index: 0, translated: '' },
      { index: 1, translated: '' },
    ]
    const result = validateBatchResponse(response, requested, opts)
    expect(result.ok).toBe(false)
    expect(result.translationMap).toBeUndefined()
    expect(result.failedIndexes).toEqual([0, 1])
  })

  it('stays strict by default so an incomplete batch is still rejected', () => {
    const requested = [0, 1, 2]
    const response = [{ index: 0, translated: 'T0' }]
    expect(validateBatchResponse(response, requested).ok).toBe(false)
    expect(validateBatchResponse(response, requested, opts).ok).toBe(true)
  })
})
