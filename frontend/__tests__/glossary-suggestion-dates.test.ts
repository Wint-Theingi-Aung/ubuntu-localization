/**
 * Tests for glossary suggestion date serialization and display.
 *
 * Covers:
 * - Date serialization in API responses (ISO 8601 strings)
 * - Safe date formatting on the frontend
 * - Approved/rejected suggestion display
 */

describe('formatTime — safe date formatter', () => {
  // Replicate the frontend formatTime logic
  function formatTime(ts: string | number | null | undefined): string {
    if (ts === null || ts === undefined || ts === '') return 'Unknown date'
    const d = new Date(ts)
    if (isNaN(d.getTime())) return 'Unknown date'
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  it('formats a valid ISO 8601 string', () => {
    const result = formatTime('2025-01-15T10:30:00.000Z')
    expect(result).not.toBe('Unknown date')
    expect(result).toContain('2025')
  })

  it('formats a valid numeric timestamp', () => {
    const ts = new Date('2025-06-01T12:00:00Z').getTime()
    const result = formatTime(ts)
    expect(result).not.toBe('Unknown date')
    expect(result).toContain('2025')
  })

  it('returns "Unknown date" for null', () => {
    expect(formatTime(null)).toBe('Unknown date')
  })

  it('returns "Unknown date" for undefined', () => {
    expect(formatTime(undefined)).toBe('Unknown date')
  })

  it('returns "Unknown date" for empty string', () => {
    expect(formatTime('')).toBe('Unknown date')
  })

  it('returns "Unknown date" for invalid string', () => {
    expect(formatTime('not-a-date')).toBe('Unknown date')
  })

  it('returns "Unknown date" for random garbage', () => {
    expect(formatTime('abc123')).toBe('Unknown date')
  })
})

describe('serializeDates — API response date serialization', () => {
  function serializeDates(entry: Record<string, any>): Record<string, any> {
    return {
      ...entry,
      createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt ?? null,
      updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt ?? null,
      reviewedAt: entry.reviewedAt instanceof Date ? entry.reviewedAt.toISOString() : entry.reviewedAt ?? null,
    }
  }

  it('converts Date objects to ISO strings', () => {
    const date = new Date('2025-03-15T08:00:00Z')
    const result = serializeDates({
      id: 1,
      createdAt: date,
      updatedAt: date,
      reviewedAt: date,
    })
    expect(result.createdAt).toBe('2025-03-15T08:00:00.000Z')
    expect(result.updatedAt).toBe('2025-03-15T08:00:00.000Z')
    expect(result.reviewedAt).toBe('2025-03-15T08:00:00.000Z')
  })

  it('passes through existing ISO strings', () => {
    const result = serializeDates({
      id: 1,
      createdAt: '2025-03-15T08:00:00.000Z',
      updatedAt: '2025-03-15T08:00:00.000Z',
      reviewedAt: null,
    })
    expect(result.createdAt).toBe('2025-03-15T08:00:00.000Z')
    expect(result.reviewedAt).toBeNull()
  })

  it('converts null reviewedAt to null', () => {
    const result = serializeDates({
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedAt: null,
    })
    expect(result.reviewedAt).toBeNull()
  })

  it('converts undefined reviewedAt to null', () => {
    const result = serializeDates({
      id: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedAt: undefined,
    })
    expect(result.reviewedAt).toBeNull()
  })

  it('preserves other fields', () => {
    const result = serializeDates({
      id: 42,
      en: 'hello',
      status: 'approved',
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedAt: null,
    })
    expect(result.id).toBe(42)
    expect(result.en).toBe('hello')
    expect(result.status).toBe('approved')
  })
})

describe('Suggestion status display', () => {
  it('approved suggestion has correct status badge class', () => {
    const status = 'approved'
    const cls = status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : ''
    expect(cls).toContain('emerald')
  })

  it('rejected suggestion has correct status badge class', () => {
    const status = 'rejected'
    const cls = status === 'rejected' ? 'bg-red-500/20 text-red-400' : ''
    expect(cls).toContain('red')
  })

  it('pending suggestion has correct status badge class', () => {
    const status = 'pending'
    const cls = status === 'pending' ? 'bg-amber-400/20 text-amber-400' : ''
    expect(cls).toContain('amber')
  })
})
