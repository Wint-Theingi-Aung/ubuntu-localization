// ═══════════════════════════════════════════════════════════════════
// DATABASE CLIENT — Neon PostgreSQL via pg
// ═══════════════════════════════════════════════════════════════════

import { Pool } from 'pg'
import crypto from 'crypto'
import { promisify } from 'util'
import glossaryData from '../data/glossary.json'

const scryptAsync = promisify(crypto.scrypt)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

export default pool

/** Run a single query */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

/** Run a single query and return the first row */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

/** Run within a transaction */
export async function transaction<T>(fn: (q: typeof query) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const txQuery = async <R = any>(text: string, params?: any[]): Promise<R[]> => {
      const result = await client.query(text, params)
      return result.rows as R[]
    }
    const result = await fn(txQuery)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

/** Initialize database schema — safe to call multiple times */
export async function initDB(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id              SERIAL PRIMARY KEY,
      launchpad_id    VARCHAR(255) NOT NULL UNIQUE,
      username        VARCHAR(255) NOT NULL,
      display_name    VARCHAR(512) DEFAULT '',
      karma           INTEGER DEFAULT 0,
      avatar_url      VARCHAR(1024) DEFAULT '',
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id              SERIAL PRIMARY KEY,
      session_token   VARCHAR(512) NOT NULL UNIQUE,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at      TIMESTAMP WITH TIME ZONE NOT NULL
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS glossary (
      id              SERIAL PRIMARY KEY,
      en              TEXT NOT NULL,
      my              TEXT DEFAULT '',
      shn             TEXT DEFAULT '',
      mnw             TEXT DEFAULT '',
      ksw             TEXT DEFAULT '',
      note            TEXT DEFAULT '',
      created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
  // Migration: add note column if missing (safe for existing tables)
  await query(`ALTER TABLE glossary ADD COLUMN IF NOT EXISTS note TEXT DEFAULT ''`).catch(() => {})
  await query(`
    CREATE TABLE IF NOT EXISTS translation_history (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action          VARCHAR(50) NOT NULL,
      description     TEXT NOT NULL,
      description_key VARCHAR(255),
      description_params JSONB,
      language        VARCHAR(100),
      details         TEXT,
      details_key     VARCHAR(255),
      details_params  JSONB,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_glossary_created_by ON glossary(created_by)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_translation_history_user ON translation_history(user_id)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_translation_history_action ON translation_history(action)`).catch(() => {})

  // Migration: add auth columns to users table
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(512)`).catch(() => {})
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE`).catch(() => {})
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`).catch(() => {})

  // Glossary history table
  await query(`
    CREATE TABLE IF NOT EXISTS glossary_history (
      id              SERIAL PRIMARY KEY,
      user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      glossary_id     INTEGER,
      action          VARCHAR(50) NOT NULL,
      old_values      JSONB,
      new_values      JSONB,
      term_en         VARCHAR(500),
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_glossary_history_user ON glossary_history(user_id)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_glossary_history_glossary ON glossary_history(glossary_id)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_glossary_history_created ON glossary_history(created_at DESC)`).catch(() => {})

  // Glossary suggestions table (for suggestion + moderation workflow)
  await query(`
    CREATE TABLE IF NOT EXISTS glossary_suggestions (
      id              SERIAL PRIMARY KEY,
      submitted_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action          VARCHAR(20) NOT NULL DEFAULT 'add',
      glossary_id     INTEGER,
      en              VARCHAR(500) NOT NULL DEFAULT '',
      my              VARCHAR(500) DEFAULT '',
      shn             VARCHAR(500) DEFAULT '',
      mnw             VARCHAR(500) DEFAULT '',
      ksw             VARCHAR(500) DEFAULT '',
      note            TEXT DEFAULT '',
      status          VARCHAR(20) NOT NULL DEFAULT 'pending',
      reviewed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at     TIMESTAMP WITH TIME ZONE,
      review_note     TEXT DEFAULT '',
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_glossary_suggestions_status ON glossary_suggestions(status)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_glossary_suggestions_submitted ON glossary_suggestions(submitted_by)`).catch(() => {})

  // Cleanup expired sessions (opportunistic)
  await query(`DELETE FROM user_sessions WHERE expires_at < NOW()`).catch(() => {})
}

/**
 * Seed the glossary table from the static JSON file if empty.
 * Preserves existing entries — only seeds when the table has zero rows.
 */
let glossarySeeded = false
export async function seedGlossaryIfEmpty(): Promise<void> {
  if (glossarySeeded) return
  const rows = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM glossary')
  if (parseInt(rows[0].count, 10) > 0) { glossarySeeded = true; return }
  const entries = (glossaryData as { entries: Array<{ id: number; en: string; my?: string; shn?: string; mnw?: string; ksw?: string }> }).entries
  for (const e of entries) {
    await query(
      'INSERT INTO glossary (id, en, my, shn, mnw, ksw) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
      [e.id, e.en, e.my || '', e.shn || '', e.mnw || '', e.ksw || ''],
    )
  }
  await query("SELECT setval('glossary_id_seq', (SELECT COALESCE(MAX(id), 0) FROM glossary))")
  glossarySeeded = true
}

// ── Database History Operations ────────────────────────────────

export interface DbHistoryEntry {
  id: number
  user_id: number | null
  action: string
  description: string
  description_key: string | null
  description_params: any
  language: string | null
  details: string | null
  details_key: string | null
  details_params: any
  created_at: Date
}

/**
 * Record a translation history entry in the database
 */
export async function recordDbHistory(entry: {
  userId?: number
  action: string
  description: string
  descriptionKey?: string
  descriptionParams?: Record<string, string | number>
  language?: string
  details?: string
  detailsKey?: string
  detailsParams?: Record<string, string | number>
}): Promise<void> {
  await query(
    `INSERT INTO translation_history
     (user_id, action, description, description_key, description_params, language, details, details_key, details_params)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      entry.userId || null,
      entry.action,
      entry.description,
      entry.descriptionKey || null,
      entry.descriptionParams ? JSON.stringify(entry.descriptionParams) : null,
      entry.language || null,
      entry.details || null,
      entry.detailsKey || null,
      entry.detailsParams ? JSON.stringify(entry.detailsParams) : null,
    ],
  )
}

/**
 * Get translation history for a user
 */
export async function getDbHistory(userId: number, limit = 50): Promise<DbHistoryEntry[]> {
  return query<DbHistoryEntry>(
    'SELECT * FROM translation_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit],
  )
}

// ── Database Glossary Operations ───────────────────────────────

export interface DbGlossaryEntry {
  id: number
  en: string
  my: string
  shn: string
  mnw: string
  ksw: string
  note: string
  created_by: number | null
  created_at: Date
  updated_at: Date
}

/**
 * Get all glossary entries from the database
 */
export async function getDbGlossary(): Promise<DbGlossaryEntry[]> {
  return query<DbGlossaryEntry>('SELECT * FROM glossary ORDER BY id ASC')
}

/**
 * Add a glossary entry
 */
export async function addDbGlossaryEntry(
  entry: { en: string; my?: string; shn?: string; mnw?: string; ksw?: string; note?: string },
  userId?: number,
): Promise<DbGlossaryEntry> {
  const result = await queryOne<DbGlossaryEntry>(
    'INSERT INTO glossary (en, my, shn, mnw, ksw, note, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [entry.en, entry.my || '', entry.shn || '', entry.mnw || '', entry.ksw || '', entry.note || '', userId || null],
  )
  if (!result) throw new Error('Failed to add glossary entry')
  return result
}

/**
 * Update a glossary entry
 */
export async function updateDbGlossaryEntry(
  id: number,
  entry: { en?: string; my?: string; shn?: string; mnw?: string; ksw?: string; note?: string },
): Promise<DbGlossaryEntry | null> {
  const fields: string[] = []
  const values: any[] = []
  let idx = 1

  if (entry.en !== undefined) { fields.push(`en = $${idx++}`); values.push(entry.en) }
  if (entry.my !== undefined) { fields.push(`my = $${idx++}`); values.push(entry.my) }
  if (entry.shn !== undefined) { fields.push(`shn = $${idx++}`); values.push(entry.shn) }
  if (entry.mnw !== undefined) { fields.push(`mnw = $${idx++}`); values.push(entry.mnw) }
  if (entry.ksw !== undefined) { fields.push(`ksw = $${idx++}`); values.push(entry.ksw) }
  if (entry.note !== undefined) { fields.push(`note = $${idx++}`); values.push(entry.note) }

  if (fields.length === 0) return null

  fields.push(`updated_at = NOW()`)
  values.push(id)

  return queryOne<DbGlossaryEntry>(
    `UPDATE glossary SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  )
}

/**
 * Delete a glossary entry
 */
export async function deleteDbGlossaryEntry(id: number): Promise<boolean> {
  const client = await pool.connect()
  try {
    const result = await client.query('DELETE FROM glossary WHERE id = $1', [id])
    return (result.rowCount ?? 0) > 0
  } finally {
    client.release()
  }
}

/**
 * Get glossary entries relevant to a specific language.
 * Returns all entries where the target language column is non-empty,
 * used to build translation context for the AI prompt.
 */
export async function getGlossaryForTranslation(langCode: string): Promise<{ en: string; translated: string; note: string }[]> {
  const validLangs = ['my', 'shn', 'mnw', 'ksw']
  const lang = validLangs.includes(langCode) ? langCode : 'my'
  const rows = await query<{ en: string; translated: string; note: string }>(
    `SELECT en, ${lang} AS translated, note FROM glossary WHERE ${lang} != '' AND ${lang} IS NOT NULL ORDER BY en`
  )
  return rows.map(r => ({ en: r.en, translated: String(r.translated || ''), note: r.note || '' }))
}

// ── Password Hashing ───────────────────────────────────────────

/**
 * Hash a password with salt using scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashToVerify = (await scryptAsync(password, salt, 64)) as Buffer
  return hashToVerify.toString('hex') === hash
}

// ── Session Management ─────────────────────────────────────────

export interface DbSessionUser {
  id: number
  username: string
  displayName: string
  isAdmin: boolean
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  await query(
    'INSERT INTO user_sessions (session_token, user_id, expires_at) VALUES ($1, $2, $3)',
    [token, userId, expiresAt],
  )
  return token
}

/**
 * Get a valid session and its user
 */
export async function getSessionUser(token: string): Promise<DbSessionUser | null> {
  const session = await queryOne<{ user_id: number }>(
    'SELECT user_id FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
    [token],
  )
  if (!session) return null

  const user = await queryOne<{ id: number; username: string; display_name: string; is_admin: boolean }>(
    'SELECT id, username, display_name, is_admin FROM users WHERE id = $1',
    [session.user_id],
  )
  if (!user) return null

  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    isAdmin: user.is_admin,
  }
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await query('DELETE FROM user_sessions WHERE session_token = $1', [token])
}

// ── User Management ────────────────────────────────────────────

export interface DbUser {
  id: number
  username: string
  displayName: string
  isAdmin: boolean
  createdAt: Date
}

/**
 * Create a new user with password
 */
export async function createUser(
  username: string,
  password: string,
  displayName?: string,
): Promise<DbUser> {
  const passwordHash = await hashPassword(password)
  const launchpadId = `local-${username}`
  const result = await queryOne<DbUser>(
    `INSERT INTO users (launchpad_id, username, display_name, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, display_name AS "displayName", is_admin AS "isAdmin", created_at AS "createdAt"`,
    [launchpadId, username, displayName || username, passwordHash],
  )
  if (!result) throw new Error('Failed to create user')
  return result
}

/**
 * Get a user by username (for login)
 */
export async function getUserByUsername(username: string): Promise<(DbUser & { passwordHash: string }) | null> {
  return queryOne(
    `SELECT id, username, display_name AS "displayName", is_admin AS "isAdmin", created_at AS "createdAt", password_hash AS "passwordHash"
     FROM users WHERE username = $1`,
    [username],
  )
}

/**
 * Get a user by ID
 */
export async function getUserById(id: number): Promise<DbUser | null> {
  return queryOne(
    `SELECT id, username, display_name AS "displayName", is_admin AS "isAdmin", created_at AS "createdAt"
     FROM users WHERE id = $1`,
    [id],
  )
}

// ── Glossary History ───────────────────────────────────────────

export interface DbGlossaryHistoryEntry {
  id: number
  userId: number | null
  glossaryId: number | null
  action: string
  oldValues: Record<string, any> | null
  newValues: Record<string, any> | null
  termEn: string | null
  username: string | null
  displayName: string | null
  createdAt: Date
}

/**
 * Record a glossary change
 */
export async function recordGlossaryHistory(entry: {
  userId: number
  glossaryId: number | null
  action: 'add' | 'update' | 'delete'
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  termEn: string
}): Promise<void> {
  await query(
    `INSERT INTO glossary_history (user_id, glossary_id, action, old_values, new_values, term_en)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.userId,
      entry.glossaryId,
      entry.action,
      entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      entry.newValues ? JSON.stringify(entry.newValues) : null,
      entry.termEn,
    ],
  )
}

/**
 * Get glossary history entries
 * If userId is provided, filter by user; otherwise return all (for admin)
 */
export async function getGlossaryHistory(
  limit: number,
  offset: number,
  userId?: number,
): Promise<{ entries: DbGlossaryHistoryEntry[]; total: number }> {
  const whereClause = userId ? 'WHERE gh.user_id = $1' : ''
  const params = userId ? [userId, limit, offset] : [limit, offset]
  const countParams = userId ? [userId] : []

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM glossary_history gh ${whereClause}`,
    countParams,
  )
  const total = parseInt(countResult?.count || '0', 10)

  const entries = await query<DbGlossaryHistoryEntry>(
    `SELECT gh.id, gh.user_id AS "userId", gh.glossary_id AS "glossaryId",
            gh.action, gh.old_values AS "oldValues", gh.new_values AS "newValues",
            gh.term_en AS "termEn", gh.created_at AS "createdAt",
            u.username, u.display_name AS "displayName"
     FROM glossary_history gh
     LEFT JOIN users u ON gh.user_id = u.id
     ${whereClause}
     ORDER BY gh.created_at DESC
     LIMIT $${userId ? 2 : 1} OFFSET $${userId ? 3 : 2}`,
    params,
  )

  return { entries, total }
}

// ── Glossary Suggestions ────────────────────────────────────────

export interface DbGlossarySuggestion {
  id: number
  submittedBy: number | null
  action: string
  glossaryId: number | null
  en: string
  my: string
  shn: string
  mnw: string
  ksw: string
  note: string
  status: string
  reviewedBy: number | null
  reviewedAt: Date | null
  reviewNote: string
  createdAt: Date
  updatedAt: Date
  submitterUsername?: string
  submitterDisplayName?: string
  reviewerUsername?: string
  reviewerDisplayName?: string
}

/**
 * Create a new glossary suggestion (regular users)
 */
export async function createGlossarySuggestion(
  userId: number,
  data: { action: string; glossaryId?: number; en: string; my?: string; shn?: string; mnw?: string; ksw?: string; note?: string },
): Promise<DbGlossarySuggestion> {
  const result = await queryOne<DbGlossarySuggestion>(
    `INSERT INTO glossary_suggestions (submitted_by, action, glossary_id, en, my, shn, mnw, ksw, note, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
     RETURNING *`,
    [
      userId,
      data.action,
      data.glossaryId || null,
      data.en,
      data.my || '',
      data.shn || '',
      data.mnw || '',
      data.ksw || '',
      data.note || '',
    ],
  )
  if (!result) throw new Error('Failed to create suggestion')
  return result
}

/**
 * List glossary suggestions (admin: all, regular user: own only)
 */
export async function listGlossarySuggestions(
  limit: number = 50,
  offset: number = 0,
  status?: string,
  userId?: number,
): Promise<{ entries: DbGlossarySuggestion[]; total: number }> {
  const conditions: string[] = []
  const params: any[] = []
  let paramIdx = 1

  if (status) {
    conditions.push(`gs.status = $${paramIdx++}`)
    params.push(status)
  }
  if (userId) {
    conditions.push(`gs.submitted_by = $${paramIdx++}`)
    params.push(userId)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM glossary_suggestions gs ${whereClause}`,
    params.slice(0, paramIdx - 1),
  )
  const total = parseInt(countResult?.count || '0', 10)

  const entries = await query<DbGlossarySuggestion>(
    `SELECT gs.*,
            su.username AS "submitterUsername", su.display_name AS "submitterDisplayName",
            ru.username AS "reviewerUsername", ru.display_name AS "reviewerDisplayName"
     FROM glossary_suggestions gs
     LEFT JOIN users su ON gs.submitted_by = su.id
     LEFT JOIN users ru ON gs.reviewed_by = ru.id
     ${whereClause}
     ORDER BY gs.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset],
  )

  return { entries, total }
}

/**
 * Update suggestion status (admin only: approve/reject)
 */
export async function updateGlossarySuggestionStatus(
  id: number,
  status: 'approved' | 'rejected',
  reviewedBy: number,
  reviewNote?: string,
): Promise<DbGlossarySuggestion | null> {
  return queryOne<DbGlossarySuggestion>(
    `UPDATE glossary_suggestions
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, reviewedBy, reviewNote || '', id],
  )
}
