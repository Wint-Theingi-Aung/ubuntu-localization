/**
 * Tests for translation batch response validation and format specifier handling.
 *
 * Covers:
 * - Batch structural validation (count, indexes, duplicates, empties)
 * - Format specifier mismatch detection
 * - State semantics: format mismatch is a warning, not a state change
 */

import { validateBatchResponse, compareFormatSpecifiers, extractFormatSpecifiers } from '../src/lib/translate'

describe('validateBatchResponse', () => {
  const requested = [0, 1, 2, 3, 4]

  describe('valid responses', () => {
    it('accepts a valid batch with all requested indexes', () => {
      const response = [
        { index: 0, translated: 'Hello' },
        { index: 1, translated: 'World' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 4, translated: 'Baz' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(true)
      expect(result.translationMap!.size).toBe(5)
      expect(result.translationMap!.get(0)).toBe('Hello')
      expect(result.translationMap!.get(4)).toBe('Baz')
    })

    it('accepts response in different order than requested', () => {
      const response = [
        { index: 4, translated: 'Baz' },
        { index: 0, translated: 'Hello' },
        { index: 2, translated: 'Foo' },
        { index: 1, translated: 'World' },
        { index: 3, translated: 'Bar' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(true)
      expect(result.translationMap!.get(4)).toBe('Baz')
    })
  })

  describe('invalid structure', () => {
    it('rejects null response', () => {
      const result = validateBatchResponse(null, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('expected an array')
    })

    it('rejects undefined response', () => {
      const result = validateBatchResponse(undefined, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('expected an array')
    })

    it('rejects non-array response', () => {
      const result = validateBatchResponse({ translations: [] }, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('expected an array')
    })

    it('rejects result object with missing index', () => {
      const response = [
        { translated: 'Hello' },
        { index: 1, translated: 'World' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 4, translated: 'Baz' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Invalid translation result object')
    })

    it('rejects result object with missing translated', () => {
      const response = [
        { index: 0 },
        { index: 1, translated: 'World' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 4, translated: 'Baz' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Invalid translation result object')
    })

    it('rejects result object with non-string translated', () => {
      const response = [
        { index: 0, translated: 123 },
        { index: 1, translated: 'World' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 4, translated: 'Baz' },
      ]
      const result = validateBatchResponse(response as any, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Invalid translation result object')
    })

    it('rejects null result object in array', () => {
      const response = [
        null,
        { index: 1, translated: 'World' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 4, translated: 'Baz' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Invalid translation result object')
    })
  })

  describe('count mismatch', () => {
    it('rejects fewer results than requested', () => {
      const response = [
        { index: 0, translated: 'Hello' },
        { index: 1, translated: 'World' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Incomplete batch response')
      expect(result.error).toContain('expected 5')
      expect(result.error).toContain('got 2')
    })

    it('rejects more results than requested', () => {
      const response = [
        { index: 0, translated: 'Hello' },
        { index: 1, translated: 'World' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 4, translated: 'Baz' },
        { index: 5, translated: 'Extra' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Incomplete batch response')
      expect(result.error).toContain('expected 5')
      expect(result.error).toContain('got 6')
    })

    it('rejects empty array when entries expected', () => {
      const result = validateBatchResponse([], requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Incomplete batch response')
    })
  })

  describe('duplicate indexes', () => {
    it('rejects response with duplicate indexes', () => {
      const response = [
        { index: 0, translated: 'Hello' },
        { index: 0, translated: 'Duplicate' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 4, translated: 'Baz' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Duplicate indexes')
      expect(result.error).toContain('0')
    })
  })

  describe('missing indexes', () => {
    it('rejects response missing a requested index', () => {
      const response = [
        { index: 0, translated: 'Hello' },
        { index: 1, translated: 'World' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 99, translated: 'Wrong' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Missing index')
      expect(result.error).toContain('4')
    })
  })

  describe('unexpected indexes', () => {
    it('rejects response with index not in requested set', () => {
      const response = [
        { index: 0, translated: 'Hello' },
        { index: 1, translated: 'World' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 99, translated: 'Unexpected' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toMatch(/(Missing|Unexpected)/)
    })
  })

  describe('empty translations', () => {
    it('rejects empty string translation', () => {
      const response = [
        { index: 0, translated: 'Hello' },
        { index: 1, translated: '' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 4, translated: 'Baz' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Empty translation')
      expect(result.error).toContain('index 1')
    })

    it('rejects whitespace-only translation', () => {
      const response = [
        { index: 0, translated: 'Hello' },
        { index: 1, translated: '   ' },
        { index: 2, translated: 'Foo' },
        { index: 3, translated: 'Bar' },
        { index: 4, translated: 'Baz' },
      ]
      const result = validateBatchResponse(response, requested)
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Empty translation')
    })
  })

  describe('zero-length batch', () => {
    it('accepts empty requested with empty response', () => {
      const result = validateBatchResponse([], [])
      expect(result.ok).toBe(true)
      expect(result.translationMap!.size).toBe(0)
    })
  })
})

describe('compareFormatSpecifiers', () => {
  it('detects matching specifiers', () => {
    const result = compareFormatSpecifiers('Hello %s, you have %d items', 'Hi %s, you have %d items')
    expect(result.match).toBe(true)
    expect(result.missing).toHaveLength(0)
    expect(result.extra).toHaveLength(0)
    expect(result.orderMismatch).toBe(false)
  })

  it('detects missing specifier in translation', () => {
    const result = compareFormatSpecifiers('Hello %s, you have %d items', 'Hi %s, you have items')
    expect(result.match).toBe(false)
    expect(result.missing).toContain('%d')
  })

  it('detects extra specifier in translation', () => {
    const result = compareFormatSpecifiers('Hello %s', 'Hi %s %d')
    expect(result.match).toBe(false)
    expect(result.extra).toContain('%d')
  })

  it('detects order mismatch', () => {
    const result = compareFormatSpecifiers('%s is %d years old', '%d is %s years old')
    expect(result.match).toBe(false)
    expect(result.missing).toHaveLength(0)
    expect(result.extra).toHaveLength(0)
    expect(result.orderMismatch).toBe(true)
  })

  it('handles named placeholders %(name)s', () => {
    const result = compareFormatSpecifiers('%(name)s has %(count)d', '%(name)s has %(count)d')
    expect(result.match).toBe(true)
  })

  it('handles length modifiers %ld, %lld', () => {
    const result = compareFormatSpecifiers('Size: %ld bytes', 'Size: %ld bytes')
    expect(result.match).toBe(true)
  })

  it('detects mismatched length modifiers', () => {
    const result = compareFormatSpecifiers('Size: %ld bytes', 'Size: %lld bytes')
    expect(result.match).toBe(false)
  })

  it('handles flags and width %02d, %-20s', () => {
    const result = compareFormatSpecifiers('Count: %02d, Name: %-20s', 'Count: %02d, Name: %-20s')
    expect(result.match).toBe(true)
  })

  it('returns match true when no specifiers in either', () => {
    const result = compareFormatSpecifiers('Hello world', 'Hello world')
    expect(result.match).toBe(true)
  })
})
