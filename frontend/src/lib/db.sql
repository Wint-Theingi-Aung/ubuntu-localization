-- ═══════════════════════════════════════════════════════════════════
-- DATABASE SCHEMA — Ubuntu Localization Tool
-- PostgreSQL-compatible (Neon, self-hosted, etc.)
-- ═══════════════════════════════════════════════════════════════════

-- Users table — Launchpad identity only, no passwords
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  launchpad_id    VARCHAR(255) NOT NULL UNIQUE,
  username        VARCHAR(255) NOT NULL,
  display_name    VARCHAR(512) DEFAULT '',
  karma           INTEGER DEFAULT 0,
  avatar_url      VARCHAR(1024) DEFAULT '',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth sessions — temporary request tokens during OAuth flow
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id              SERIAL PRIMARY KEY,
  request_token   VARCHAR(512) NOT NULL UNIQUE,
  request_secret  VARCHAR(512) NOT NULL,
  state           VARCHAR(512),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at      TIMESTAMP WITH TIME ZONE NOT NULL
);

-- User sessions — persistent login sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id              SERIAL PRIMARY KEY,
  session_token   VARCHAR(512) NOT NULL UNIQUE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at      TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Glossary — community-contributed translation terms
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
);

-- Translation history — server-side activity log
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
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_token ON oauth_sessions(request_token);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires ON oauth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_glossary_created_by ON glossary(created_by);
CREATE INDEX IF NOT EXISTS idx_translation_history_user ON translation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_translation_history_action ON translation_history(action);
CREATE INDEX IF NOT EXISTS idx_users_launchpad_id ON users(launchpad_id);
