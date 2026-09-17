// ═══════════════════════════════════════════════════════════════════
// DATABASE CLIENT — Neon PostgreSQL via pg
// ═══════════════════════════════════════════════════════════════════

import { Pool } from 'pg'

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
    CREATE TABLE IF NOT EXISTS oauth_sessions (
      id              SERIAL PRIMARY KEY,
      request_token   VARCHAR(512) NOT NULL UNIQUE,
      request_secret  VARCHAR(512) NOT NULL,
      state           VARCHAR(512),
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at      TIMESTAMP WITH TIME ZONE NOT NULL
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
      created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `)
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
  await query(`CREATE INDEX IF NOT EXISTS idx_oauth_sessions_token ON oauth_sessions(request_token)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires ON oauth_sessions(expires_at)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_glossary_created_by ON glossary(created_by)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_translation_history_user ON translation_history(user_id)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_translation_history_action ON translation_history(action)`).catch(() => {})
  await query(`CREATE INDEX IF NOT EXISTS idx_users_launchpad_id ON users(launchpad_id)`).catch(() => {})
}
