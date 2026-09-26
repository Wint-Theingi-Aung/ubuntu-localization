/**
 * Tests for /api/admin/ui-translations PUT handler.
 *
 * Covers:
 * - Successful admin save
 * - Unauthenticated request (401)
 * - Non-admin user (403)
 * - Invalid language code (400)
 * - Malformed / non-JSON request body (400)
 * - Missing translations object (400)
 */

// Mocks must come before imports that touch db.ts (which creates a Pool at module scope)
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    connect: jest.fn(() => Promise.resolve({
      query: jest.fn(() => Promise.resolve({ rows: [] })),
      release: jest.fn(),
    })),
    query: jest.fn(() => Promise.resolve({ rows: [] })),
    end: jest.fn(),
  })),
}))

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  scrypt: jest.fn((_p: any, _s: any, _k: any, cb: any) => cb(null, Buffer.from('hash'))),
}))

jest.mock('@/lib/db', () => ({
  initDB: jest.fn(() => Promise.resolve()),
  upsertUiTranslations: jest.fn(() => Promise.resolve()),
  getAllUiTranslations: jest.fn(() => Promise.resolve({})),
  getUiTranslationKeys: jest.fn(() => Promise.resolve([])),
  getGlossaryForTranslation: jest.fn(() => Promise.resolve([])),
  seedGlossaryIfEmpty: jest.fn(() => Promise.resolve()),
}))

jest.mock('@/lib/auth', () => ({
  getAuthUser: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { PUT } from '@/app/api/admin/ui-translations/route'
import { getAuthUser } from '@/lib/auth'
import { upsertUiTranslations } from '@/lib/db'

const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>
const mockUpsert = upsertUiTranslations as jest.MockedFunction<typeof upsertUiTranslations>

// ── Helpers ─────────────────────────────────────────────────────

function makePutRequest(body: unknown, contentType = 'application/json'): NextRequest {
  const init: RequestInit = {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
  }
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }
  return new NextRequest('http://localhost/api/admin/ui-translations', init)
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  if (!text.trim()) return {}
  return JSON.parse(text)
}

// ── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PUT /api/admin/ui-translations', () => {
  it('saves translations for a valid admin request', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 1, username: 'admin', displayName: 'Admin', isAdmin: true })
    const req = makePutRequest({ lang: 'my', translations: { greeting: 'မင်္ဂလာပါ' } })
    const res = await PUT(req)
    const body = await readJson(res)

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.saved).toBe(1)
    expect(mockUpsert).toHaveBeenCalledWith('my', { greeting: 'မင်္ဂလာပါ' }, 1)
  })

  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const req = makePutRequest({ lang: 'my', translations: { greeting: 'Hello' } })
    const res = await PUT(req)
    const body = await readJson(res)

    expect(res.status).toBe(401)
    expect(body.error).toBe('Authentication required')
  })

  it('returns 403 when authenticated but not admin', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 2, username: 'user', displayName: 'User', isAdmin: false })
    const req = makePutRequest({ lang: 'my', translations: { greeting: 'Hello' } })
    const res = await PUT(req)
    const body = await readJson(res)

    expect(res.status).toBe(403)
    expect(body.error).toBe('Admin access required')
  })

  it('returns 400 for invalid language code', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 1, username: 'admin', displayName: 'Admin', isAdmin: true })
    const req = makePutRequest({ lang: 'zz', translations: { greeting: 'Hello' } })
    const res = await PUT(req)
    const body = await readJson(res)

    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid language code')
  })

  it('returns 400 when lang is missing', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 1, username: 'admin', displayName: 'Admin', isAdmin: true })
    const req = makePutRequest({ translations: { greeting: 'Hello' } })
    const res = await PUT(req)
    const body = await readJson(res)

    expect(res.status).toBe(400)
    expect(body.error).toBe('Language code is required')
  })

  it('returns 400 when translations object is missing', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 1, username: 'admin', displayName: 'Admin', isAdmin: true })
    const req = makePutRequest({ lang: 'my' })
    const res = await PUT(req)
    const body = await readJson(res)

    expect(res.status).toBe(400)
    expect(body.error).toBe('Translations object is required')
  })

  it('returns 400 for malformed JSON body', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 1, username: 'admin', displayName: 'Admin', isAdmin: true })
    const req = makePutRequest('not valid json {{{', 'application/json')
    const res = await PUT(req)
    const body = await readJson(res)

    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid JSON in request body')
  })

  it('filters out empty string values', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 1, username: 'admin', displayName: 'Admin', isAdmin: true })
    const req = makePutRequest({
      lang: 'my',
      translations: { greeting: 'Hello', farewell: '', empty: '   ' },
    })
    const res = await PUT(req)
    const body = await readJson(res)

    expect(res.status).toBe(200)
    expect(body.saved).toBe(1)
    expect(mockUpsert).toHaveBeenCalledWith('my', { greeting: 'Hello' }, 1)
  })
})
