// ═══════════════════════════════════════════════════════════════════
// DATABASE CLIENT — Neon PostgreSQL via pg
// ═══════════════════════════════════════════════════════════════════

import { Pool } from 'pg'
import glossaryData from '../data/glossary.json'

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
