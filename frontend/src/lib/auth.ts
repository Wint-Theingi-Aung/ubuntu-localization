// ═══════════════════════════════════════════════════════════════════
// AUTH — Launchpad OAuth 1.0a + Session Management
// ═══════════════════════════════════════════════════════════════════

import crypto from 'crypto'
import { query, queryOne, initDB } from './db'

export { initDB }

// ── Configuration ──────────────────────────────────────────────

const LP_WEB_ROOT = 'https://launchpad.net/'
const LP_API_ROOT = 'https://api.launchpad.net/devel'

// Launchpad uses "system-wide" consumer keys derived from OS distro + hostname.
// Format: "System-wide: {distro_name} ({hostname})"
// This matches launchpadlib's SystemWideConsumer behavior exactly.
function getConsumerKey(): string {
  const envKey = process.env.LAUNCHPAD_CONSUMER_KEY
  if (envKey) return envKey

  // Reproduce launchpadlib's SystemWideConsumer KEY_FORMAT:
  // "System-wide: %s (%s)" where %s = distro.name(), %s = socket.gethostname()
  // On Vercel serverless, /etc/os-release is unavailable — fall back gracefully.
  const hostname = process.env.HOSTNAME || process.env.HOST || 'localhost'
  return `System-wide: Ubuntu (${hostname})`
}

const CONSUMER_KEY = getConsumerKey()
const CONSUMER_SECRET = process.env.LAUNCHPAD_CONSUMER_SECRET || 'ubuntu-localization-tool'
const SESSION_SECRET = process.env.SESSION_SECRET || 'ubuntu-localization-fallback-session-secret'

const SESSION_COOKIE = 'ulp_session'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days

// ── OAuth Helpers ──────────────────────────────────────────────

/**
 * Build HMAC-SHA1 OAuth Authorization header (for API calls only).
 * Launchpad API endpoints expect standard OAuth Authorization headers.
 */
function buildOAuthAuthorizationHeader(
  method: string,
  url: string,
  params: Record<string, string>,
  tokenSecret?: string,
): string {
  function percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  }

  function hmacSha1(key: string, message: string): string {
    return crypto.createHmac('sha1', key).update(message).digest('base64')
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...params,
  }

  const sortedParams = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&')

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(sortedParams)].join('&')
  const signingKey = percentEncode(CONSUMER_SECRET) + '&' + percentEncode(tokenSecret || '')
  oauthParams.oauth_signature = hmacSha1(signingKey, baseString)

  const headerParts = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ')

  return `OAuth ${headerParts}`
}

// ── OAuth Flow ─────────────────────────────────────────────────

export interface OAuthRequestToken {
  requestToken: string
  requestSecret: string
  authorizationUrl: string
}

/**
 * Step 1: Get a request token from Launchpad.
 *
 * Launchpad uses PLAINTEXT signature method and sends OAuth params
 * as POST body (not Authorization header), with a Referer header.
 * Endpoint: https://launchpad.net/+request-token
 */
export async function getRequestToken(callbackUrl: string): Promise<OAuthRequestToken> {
  const url = `${LP_WEB_ROOT}+request-token`
  const params = new URLSearchParams({
    oauth_consumer_key: CONSUMER_KEY,
    oauth_signature_method: 'PLAINTEXT',
    oauth_signature: '&',
    oauth_callback: callbackUrl,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': LP_WEB_ROOT,
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get request token: ${res.status} ${text}`)
  }

  const text = await res.text()
  const data = Object.fromEntries(new URLSearchParams(text))

  if (!data.oauth_token || !data.oauth_token_secret) {
    throw new Error('Invalid request token response')
  }

  const authorizationUrl = `${LP_WEB_ROOT}+authorize-token?oauth_token=${data.oauth_token}`

  return {
    requestToken: data.oauth_token,
    requestSecret: data.oauth_token_secret,
    authorizationUrl,
  }
}

export interface OAuthAccessToken {
  accessToken: string
  accessSecret: string
}

/**
 * Step 3: Exchange request token + verifier for access token.
 *
 * Launchpad uses PLAINTEXT signature: &{request_token_secret}
 * Endpoint: https://launchpad.net/+access-token
 */
export async function getAccessToken(
  requestToken: string,
  requestSecret: string,
  verifier: string,
): Promise<OAuthAccessToken> {
  const url = `${LP_WEB_ROOT}+access-token`
  const params = new URLSearchParams({
    oauth_consumer_key: CONSUMER_KEY,
    oauth_signature_method: 'PLAINTEXT',
    oauth_token: requestToken,
    oauth_signature: `&${requestSecret}`,
    oauth_verifier: verifier,
  })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': LP_WEB_ROOT,
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get access token: ${res.status} ${text}`)
  }

  const text = await res.text()
  const data = Object.fromEntries(new URLSearchParams(text))

  if (!data.oauth_token || !data.oauth_token_secret) {
    throw new Error('Invalid access token response')
  }

  return {
    accessToken: data.oauth_token,
    accessSecret: data.oauth_token_secret,
  }
}

// ── Launchpad API Calls ────────────────────────────────────────

export interface LaunchpadUser {
  name: string
  display_name: string
  karma: number
  web_link: string
  avatar_url?: string
}

/**
 * Fetch authenticated user's profile from Launchpad API.
 *
 * Uses HMAC-SHA1 Authorization header (standard OAuth for API calls).
 * Endpoint: https://api.launchpad.net/devel/people/+me
 */
export async function getLaunchpadUser(
  accessToken: string,
  accessSecret: string,
): Promise<LaunchpadUser> {
  const url = `${LP_API_ROOT}/people/+me`
  const params: Record<string, string> = {
    oauth_token: accessToken,
  }

  const authHeader = buildOAuthAuthorizationHeader('GET', url, params, accessSecret)

  const res = await fetch(url, {
    headers: {
      Authorization: authHeader,
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch Launchpad user: ${res.status}`)
  }

  const user = await res.json()

  return {
    name: user.name || '',
    display_name: user.display_name || '',
    karma: user.karma || 0,
    web_link: user.web_link || '',
    avatar_url: user.avatar_image_url || '',
  }
}

// ── Database User Operations ───────────────────────────────────

export interface DbUser {
  id: number
  launchpad_id: string
  username: string
  display_name: string
  karma: number
  avatar_url: string
  created_at: Date
  updated_at: Date
}

/**
 * Find or create a user from Launchpad profile
 */
export async function findOrCreateUser(lpUser: LaunchpadUser): Promise<DbUser> {
  // Try to find existing user
  const existing = await queryOne<DbUser>(
    'SELECT * FROM users WHERE launchpad_id = $1',
    [lpUser.name],
  )

  if (existing) {
    // Update info
    await query(
      'UPDATE users SET username = $1, display_name = $2, karma = $3, avatar_url = $4, updated_at = NOW() WHERE launchpad_id = $5',
      [lpUser.name, lpUser.display_name, lpUser.karma, lpUser.avatar_url || '', lpUser.name],
    )
    return { ...existing, username: lpUser.name, display_name: lpUser.display_name, karma: lpUser.karma }
  }

  // Create new user
  const result = await queryOne<DbUser>(
    'INSERT INTO users (launchpad_id, username, display_name, karma, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [lpUser.name, lpUser.name, lpUser.display_name, lpUser.karma, lpUser.avatar_url || ''],
  )

  if (!result) {
    throw new Error('Failed to create user')
  }

  return result
}

// ── Session Management ─────────────────────────────────────────

export interface Session {
  id: number
  session_token: string
  user_id: number
  created_at: Date
  expires_at: Date
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)

  await query(
    'INSERT INTO user_sessions (session_token, user_id, expires_at) VALUES ($1, $2, $3)',
    [token, userId, expiresAt],
  )

  return token
}

/**
 * Validate a session token and return the associated user
 */
export async function validateSession(token: string): Promise<DbUser | null> {
  const session = await queryOne<Session>(
    'SELECT * FROM user_sessions WHERE session_token = $1 AND expires_at > NOW()',
    [token],
  )

  if (!session) return null

  const user = await queryOne<DbUser>(
    'SELECT * FROM users WHERE id = $1',
    [session.user_id],
  )

  return user || null
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await query('DELETE FROM user_sessions WHERE session_token = $1', [token])
}

/**
 * Delete expired sessions
 */
export async function cleanupSessions(): Promise<void> {
  await query('DELETE FROM user_sessions WHERE expires_at < NOW()')
}

// ── OAuth Session Storage ──────────────────────────────────────

export interface OAuthSession {
  id: number
  request_token: string
  request_secret: string
  state: string | null
  created_at: Date
  expires_at: Date
}

/**
 * Store an OAuth request session temporarily
 */
export async function storeOAuthSession(
  requestToken: string,
  requestSecret: string,
  state?: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  await query(
    'INSERT INTO oauth_sessions (request_token, request_secret, state, expires_at) VALUES ($1, $2, $3, $4)',
    [requestToken, requestSecret, state || null, expiresAt],
  )
}

/**
 * Retrieve and delete an OAuth session
 */
export async function getOAuthSession(requestToken: string): Promise<OAuthSession | null> {
  const session = await queryOne<OAuthSession>(
    'SELECT * FROM oauth_sessions WHERE request_token = $1 AND expires_at > NOW()',
    [requestToken],
  )

  if (session) {
    await query('DELETE FROM oauth_sessions WHERE request_token = $1', [requestToken])
  }

  return session
}

// ── Cookie Helpers ─────────────────────────────────────────────

/**
 * Set a session cookie on the response
 */
export function setSessionCookie(token: string, maxAge = SESSION_MAX_AGE): string {
  const cookie = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ].filter(Boolean).join('; ')
  return cookie
}

/**
 * Clear the session cookie
 */
export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ].filter(Boolean).join('; ')
}

/**
 * Extract the session token from cookies in a request
 */
export function getSessionToken(cookies: string | undefined | null): string | null {
  if (!cookies) return null
  const match = cookies.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))
  return match ? match[1] : null
}

/**
 * Get the current user from request cookies
 */
export async function getCurrentUser(cookies: string | undefined | null): Promise<DbUser | null> {
  const token = getSessionToken(cookies)
  if (!token) return null
  return validateSession(token)
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
  entry: { en: string; my?: string; shn?: string; mnw?: string; ksw?: string },
  userId?: number,
): Promise<DbGlossaryEntry> {
  const result = await queryOne<DbGlossaryEntry>(
    'INSERT INTO glossary (en, my, shn, mnw, ksw, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [entry.en, entry.my || '', entry.shn || '', entry.mnw || '', entry.ksw || '', userId || null],
  )
  if (!result) throw new Error('Failed to add glossary entry')
  return result
}

/**
 * Update a glossary entry
 */
export async function updateDbGlossaryEntry(
  id: number,
  entry: { en?: string; my?: string; shn?: string; mnw?: string; ksw?: string },
): Promise<DbGlossaryEntry | null> {
  const fields: string[] = []
  const values: any[] = []
  let idx = 1

  if (entry.en !== undefined) { fields.push(`en = $${idx++}`); values.push(entry.en) }
  if (entry.my !== undefined) { fields.push(`my = $${idx++}`); values.push(entry.my) }
  if (entry.shn !== undefined) { fields.push(`shn = $${idx++}`); values.push(entry.shn) }
  if (entry.mnw !== undefined) { fields.push(`mnw = $${idx++}`); values.push(entry.mnw) }
  if (entry.ksw !== undefined) { fields.push(`ksw = $${idx++}`); values.push(entry.ksw) }

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
  const result = await query('DELETE FROM glossary WHERE id = $1', [id])
  return (result as any).rowCount > 0
}
