"""Database service — unified Postgres/SQLite backend.

Uses aiosqlite (zero-install, always works) by default.
When Postgres is available (PGHOST/PGURL env), switches to psycopg2.

Schema: users, sessions, translations, exports, karma_events, leaderboard
"""

import os
import json
import sqlite3
import threading
from pathlib import Path
from datetime import datetime, timezone
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Optional, Any

from backend.config import PROJECT_ROOT

# ── Configuration ─────────────────────────────────────────────────────

if os.getenv("VERCEL") or os.getenv("RAILWAY_ENVIRONMENT"):
    DB_DIR = Path("/tmp") / "ubuntu-localization" / "db"
else:
    DB_DIR = Path.home() / ".local" / "share" / "ubuntu-localization"
DB_DIR.mkdir(parents=True, exist_ok=True)
SQLITE_PATH = DB_DIR / "localization.db"

# Postgres URL takes precedence
PG_URL = os.getenv("DATABASE_URL") or os.getenv("PGURL", "")

# ── Schema (shared DDL adapted per backend) ───────────────────────────

SCHEMA_SQL = """
-- Users table (linked to Launchpad identities)
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    username        TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL DEFAULT '',
    karma_total     INTEGER NOT NULL DEFAULT 0,
    web_link        TEXT DEFAULT '',
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Translation sessions
CREATE TABLE IF NOT EXISTS sessions (
    id              SERIAL PRIMARY KEY,
    session_key     TEXT UNIQUE NOT NULL,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    filename        TEXT NOT NULL DEFAULT '',
    language_code   TEXT NOT NULL DEFAULT 'my',
    language_name   TEXT NOT NULL DEFAULT '',
    total_entries   INTEGER NOT NULL DEFAULT 0,
    translated_before INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual translations (each string translated)
CREATE TABLE IF NOT EXISTS translations (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    entry_index     INTEGER NOT NULL,
    msgid           TEXT NOT NULL DEFAULT '',
    msgstr          TEXT NOT NULL DEFAULT '',
    msgctxt         TEXT DEFAULT NULL,
    qa_passed       BOOLEAN NOT NULL DEFAULT TRUE,
    qa_checks       TEXT DEFAULT '[]',
    translated_by   TEXT NOT NULL DEFAULT 'ai',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_translations_session ON translations(session_id);
CREATE INDEX IF NOT EXISTS idx_translations_created ON translations(created_at);

-- Export records
CREATE TABLE IF NOT EXISTS exports (
    id              SERIAL PRIMARY KEY,
    session_id      INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    export_file     TEXT NOT NULL DEFAULT '',
    source_file     TEXT NOT NULL DEFAULT '',
    language_code   TEXT NOT NULL DEFAULT 'my',
    language_name   TEXT NOT NULL DEFAULT '',
    strings_added   INTEGER NOT NULL DEFAULT 0,
    qa_passed       INTEGER NOT NULL DEFAULT 0,
    qa_failed       INTEGER NOT NULL DEFAULT 0,
    completion_before REAL NOT NULL DEFAULT 0,
    completion_after  REAL NOT NULL DEFAULT 0,
    git_commit      TEXT DEFAULT '',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exports_lang ON exports(language_code);
CREATE INDEX IF NOT EXISTS idx_exports_created ON exports(created_at);

-- Leaderboard (materialized view-like, refreshed on export)
CREATE TABLE IF NOT EXISTS leaderboard (
    id              SERIAL PRIMARY KEY,
    username        TEXT NOT NULL,
    display_name    TEXT NOT NULL DEFAULT '',
    language_code   TEXT NOT NULL DEFAULT 'my',
    strings_translated INTEGER NOT NULL DEFAULT 0,
    exports_count   INTEGER NOT NULL DEFAULT 0,
    last_contribution TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rank            INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(username, language_code)
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_lang ON leaderboard(language_code);
CREATE INDEX IF NOT EXISTS idx_leaderboard_strings ON leaderboard(strings_translated DESC);

-- Karma event log (per-translation contributions)
CREATE TABLE IF NOT EXISTS karma_events (
    id              SERIAL PRIMARY KEY,
    username        TEXT NOT NULL DEFAULT '',
    event_type      TEXT NOT NULL DEFAULT 'translation',
    language_code   TEXT NOT NULL DEFAULT 'my',
    strings_count   INTEGER NOT NULL DEFAULT 0,
    points          INTEGER NOT NULL DEFAULT 0,
    description     TEXT DEFAULT '',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_karma_user ON karma_events(username);
CREATE INDEX IF NOT EXISTS idx_karma_created ON karma_events(created_at);
"""

# ── SQLite-compatible schema (no SERIAL, use AUTOINCREMENT) ──────────

SQLITE_SCHEMA = SCHEMA_SQL.replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")

# ── Connection management ─────────────────────────────────────────────

_local = threading.local()


def _get_sqlite_conn() -> sqlite3.Connection:
    """Get a thread-local SQLite connection with WAL mode."""
    if not hasattr(_local, "sqlite_conn") or _local.sqlite_conn is None:
        conn = sqlite3.connect(str(SQLITE_PATH))
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.row_factory = sqlite3.Row
        _local.sqlite_conn = conn
    return _local.sqlite_conn


def _get_pg_conn():
    """Get a psycopg2 connection when Postgres is available."""
    if not hasattr(_local, "pg_conn") or _local.pg_conn is None:
        import psycopg2
        import psycopg2.extras
        if PG_URL:
            conn = psycopg2.connect(PG_URL)
        else:
            conn = psycopg2.connect(
                host=os.getenv("PGHOST", "localhost"),
                port=int(os.getenv("PGPORT", "5432")),
                dbname=os.getenv("PGDATABASE", "ubuntu_localization"),
                user=os.getenv("PGUSER", os.environ.get("USER", "wint")),
                password=os.getenv("PGPASSWORD", ""),
            )
        conn.autocommit = False
        _local.pg_conn = conn
    return _local.pg_conn


def _get_conn():
    """Get the best available database connection."""
    if PG_URL:
        return _get_pg_conn()
    if os.getenv("PGHOST"):
        return _get_pg_conn()
    return _get_sqlite_conn()


def _is_pg() -> bool:
    return bool(PG_URL or os.getenv("PGHOST"))


@contextmanager
def _transaction():
    """Context manager for database transactions."""
    if _is_pg():
        conn = _get_pg_conn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
    else:
        conn = _get_sqlite_conn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise


# ── Initialization ────────────────────────────────────────────────────

_initialized = False
DB_AVAILABLE = False


def init_db():
    """Create tables if they don't exist. Idempotent — safe to call repeatedly.

    Sets DB_AVAILABLE=True on success, DB_AVAILABLE=False on failure.
    When False, all query functions return empty/None gracefully.
    """
    global _initialized, DB_AVAILABLE
    if _initialized:
        return

    try:
        if _is_pg():
            conn = _get_pg_conn()
            with conn.cursor() as cur:
                cur.execute(SCHEMA_SQL)
            conn.commit()
        else:
            conn = _get_sqlite_conn()
            # Execute each top-level SQL statement separately
            # Split on semicolons but preserve multi-line statements
            statements = _split_sql(SQLITE_SCHEMA)
            for stmt in statements:
                stmt = stmt.strip()
                if stmt and not stmt.startswith("--"):
                    try:
                        conn.execute(stmt)
                    except sqlite3.OperationalError as e:
                        err = str(e).lower()
                        if "already exists" in err or "duplicate" in err:
                            pass
                        else:
                            raise
            conn.commit()

        DB_AVAILABLE = True
    except Exception:
        DB_AVAILABLE = False
    finally:
        _initialized = True


def _split_sql(sql: str) -> list[str]:
    """Split SQL text into individual statements, handling multi-line DDL."""
    statements = []
    current = []
    for line in sql.split("\n"):
        stripped = line.strip()
        if stripped.startswith("--") or not stripped:
            if current:
                current.append(line)
            continue
        current.append(line)
        if stripped.endswith(";"):
            stmt = "\n".join(current)
            if stmt.strip() and stmt.strip() != ";":
                statements.append(stmt)
            current = []
    if current:
        stmt = "\n".join(current)
        if stmt.strip():
            statements.append(stmt)
    return statements


# ── User Operations ───────────────────────────────────────────────────

def upsert_user(username: str, display_name: str = "", karma: int = 0, web_link: str = "") -> int:
    """Insert or update a user, return their ID."""
    if not DB_AVAILABLE:
        return 0
    with _transaction() as conn:
        cur = conn.cursor()
        if _is_pg():
            cur.execute("""
                INSERT INTO users (username, display_name, karma_total, web_link, last_seen_at)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (username) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    karma_total = EXCLUDED.karma_total,
                    web_link = EXCLUDED.web_link,
                    last_seen_at = CURRENT_TIMESTAMP
                RETURNING id
            """, (username, display_name, karma, web_link))
            user_id = cur.fetchone()[0]
        else:
            cur.execute("""
                INSERT INTO users (username, display_name, karma_total, web_link, last_seen_at)
                VALUES (?, ?, ?, ?, datetime('now'))
                ON CONFLICT(username) DO UPDATE SET
                    display_name = excluded.display_name,
                    karma_total = excluded.karma_total,
                    web_link = excluded.web_link,
                    last_seen_at = datetime('now')
            """, (username, display_name, karma, web_link))
            user_id = cur.lastrowid
        return user_id


def get_user(username: str) -> Optional[dict]:
    """Get a user by username."""
    if not DB_AVAILABLE:
        return None
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?" if not _is_pg() else
                "SELECT * FROM users WHERE username = %s",
                (username,))
    row = cur.fetchone()
    if row:
        return dict(row) if hasattr(row, "keys") else {
            "id": row[0], "username": row[1], "display_name": row[2],
            "karma_total": row[3], "web_link": row[4], "is_admin": row[5],
            "created_at": row[6], "last_seen_at": row[7],
        }
    return None


def list_users(limit: int = 50) -> list[dict]:
    """List users ordered by karma."""
    if not DB_AVAILABLE:
        return []
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT username, display_name, karma_total, web_link, last_seen_at FROM users ORDER BY karma_total DESC LIMIT ?" if not _is_pg() else
        "SELECT username, display_name, karma_total, web_link, last_seen_at FROM users ORDER BY karma_total DESC LIMIT %s",
        (limit,))
    return [_row_to_dict(row) for row in cur.fetchall()]


# ── Session Operations ────────────────────────────────────────────────

def create_session(session_key: str, filename: str = "", language_code: str = "my",
                   language_name: str = "", total_entries: int = 0,
                   translated_before: int = 0, username: str = "") -> int:
    """Create a new translation session."""
    if not DB_AVAILABLE:
        return 0
    user_id = None
    if username:
        user = get_user(username)
        if user:
            user_id = user["id"]

    with _transaction() as conn:
        cur = conn.cursor()
        if _is_pg():
            cur.execute("""
                INSERT INTO sessions (session_key, user_id, filename, language_code, language_name, total_entries, translated_before)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (session_key) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                RETURNING id
            """, (session_key, user_id, filename, language_code, language_name, total_entries, translated_before))
            return cur.fetchone()[0]
        else:
            cur.execute("""
                INSERT INTO sessions (session_key, user_id, filename, language_code, language_name, total_entries, translated_before)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_key) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            """, (session_key, user_id, filename, language_code, language_name, total_entries, translated_before))
            return cur.lastrowid


def get_session(session_key: str) -> Optional[dict]:
    """Get a session by key."""
    if not DB_AVAILABLE:
        return None
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM sessions WHERE session_key = ?" if not _is_pg() else
                "SELECT * FROM sessions WHERE session_key = %s", (session_key,))
    row = cur.fetchone()
    return _row_to_dict(row) if row else None


def list_sessions(limit: int = 20) -> list[dict]:
    """List recent sessions."""
    if not DB_AVAILABLE:
        return []
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT session_key, filename, language_code, language_name, total_entries, translated_before, status, created_at FROM sessions ORDER BY updated_at DESC LIMIT ?" if not _is_pg() else
        "SELECT session_key, filename, language_code, language_name, total_entries, translated_before, status, created_at FROM sessions ORDER BY updated_at DESC LIMIT %s",
        (limit,))
    return [_row_to_dict(row) for row in cur.fetchall()]


def update_session_progress(session_key: str, translated_count: int, status: str = "active"):
    """Update translation progress on a session."""
    with _transaction() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE session_key = ?" if not _is_pg() else
            "UPDATE sessions SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE session_key = %s",
            (status, session_key))


# ── Translation Operations ────────────────────────────────────────────

def save_translation(session_key: str, entry_index: int, msgid: str, msgstr: str,
                     msgctxt: str = "", qa_passed: bool = True, qa_checks: list = None,
                     translated_by: str = "ai"):
    """Save a single translation."""
    if not DB_AVAILABLE:
        return
    session = get_session(session_key)
    if not session:
        return None

    with _transaction() as conn:
        cur = conn.cursor()
        checks_json = json.dumps(qa_checks or [], ensure_ascii=False)
        if _is_pg():
            cur.execute("""
                INSERT INTO translations (session_id, entry_index, msgid, msgstr, msgctxt, qa_passed, qa_checks, translated_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (session["id"], entry_index, msgid, msgstr, msgctxt, qa_passed, checks_json, translated_by))
        else:
            cur.execute("""
                INSERT INTO translations (session_id, entry_index, msgid, msgstr, msgctxt, qa_passed, qa_checks, translated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (session["id"], entry_index, msgid, msgstr, msgctxt, qa_passed, checks_json, translated_by))


def get_session_translations(session_key: str) -> list[dict]:
    """Get all translations for a session."""
    if not DB_AVAILABLE:
        return []
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT t.entry_index, t.msgid, t.msgstr, t.qa_passed, t.qa_checks, t.translated_by, t.created_at
        FROM translations t JOIN sessions s ON t.session_id = s.id
        WHERE s.session_key = ?
        ORDER BY t.entry_index
    """ if not _is_pg() else """
        SELECT t.entry_index, t.msgid, t.msgstr, t.qa_passed, t.qa_checks, t.translated_by, t.created_at
        FROM translations t JOIN sessions s ON t.session_id = s.id
        WHERE s.session_key = %s
        ORDER BY t.entry_index
    """, (session_key,))
    return [_row_to_dict(row) for row in cur.fetchall()]


# ── Export Operations ─────────────────────────────────────────────────

def log_export(session_key: str, export_file: str, source_file: str, language_code: str,
               language_name: str, strings_added: int, qa_passed: int, qa_failed: int,
               completion_before: float, completion_after: float,
               git_commit: str = "", username: str = "") -> int:
    """Log an export event."""
    if not DB_AVAILABLE:
        return 0
    user_id = None
    if username:
        user = get_user(username)
        if user:
            user_id = user["id"]

    session = get_session(session_key)
    session_id = session["id"] if session else None

    with _transaction() as conn:
        cur = conn.cursor()
        if _is_pg():
            cur.execute("""
                INSERT INTO exports (session_id, user_id, export_file, source_file, language_code,
                    language_name, strings_added, qa_passed, qa_failed, completion_before,
                    completion_after, git_commit)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (session_id, user_id, export_file, source_file, language_code, language_name,
                  strings_added, qa_passed, qa_failed, completion_before, completion_after, git_commit))
            export_id = cur.fetchone()[0]
        else:
            cur.execute("""
                INSERT INTO exports (session_id, user_id, export_file, source_file, language_code,
                    language_name, strings_added, qa_passed, qa_failed, completion_before,
                    completion_after, git_commit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (session_id, user_id, export_file, source_file, language_code, language_name,
                  strings_added, qa_passed, qa_failed, completion_before, completion_after, git_commit))
            export_id = cur.lastrowid

        # Update leaderboard
        if username:
            _update_leaderboard(conn, username, "", language_code, strings_added)

        # Log karma
        if username and strings_added > 0:
            _log_karma(conn, username, language_code, strings_added)

        return export_id


def list_exports(limit: int = 50) -> list[dict]:
    """List recent exports."""
    if not DB_AVAILABLE:
        return []
    conn = _get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT export_file, source_file, language_code, language_name, strings_added, qa_passed, qa_failed, completion_before, completion_after, git_commit, created_at FROM exports ORDER BY created_at DESC LIMIT ?" if not _is_pg() else
        "SELECT export_file, source_file, language_code, language_name, strings_added, qa_passed, qa_failed, completion_before, completion_after, git_commit, created_at FROM exports ORDER BY created_at DESC LIMIT %s",
        (limit,))
    return [_row_to_dict(row) for row in cur.fetchall()]


def get_language_stats(language_code: str = "") -> dict:
    """Get aggregate stats for a language or all languages."""
    if not DB_AVAILABLE:
        return {"languages": []}
    conn = _get_conn()
    cur = conn.cursor()

    if language_code:
        cur.execute(
            "SELECT COALESCE(SUM(strings_added), 0), COUNT(*) FROM exports WHERE language_code = ?" if not _is_pg() else
            "SELECT COALESCE(SUM(strings_added), 0), COUNT(*) FROM exports WHERE language_code = %s",
            (language_code,))
        row = cur.fetchone()
        return {"language_code": language_code, "total_strings": row[0] or 0, "total_exports": row[1] or 0}

    # All languages
    cur.execute(
        "SELECT language_code, COALESCE(SUM(strings_added), 0) as total, COUNT(*) as cnt FROM exports GROUP BY language_code ORDER BY total DESC")
    return {"languages": [{"language_code": r[0], "total_strings": r[1], "total_exports": r[2]} for r in cur.fetchall()]}


# ── Leaderboard ───────────────────────────────────────────────────────

def _update_leaderboard(conn, username: str, display_name: str, language_code: str, strings_added: int):
    """Update leaderboard ranking for a user (called within a transaction)."""
    cur = conn.cursor()
    if _is_pg():
        cur.execute("""
            INSERT INTO leaderboard (username, display_name, language_code, strings_translated, exports_count, last_contribution)
            VALUES (%s, %s, %s, %s, 1, CURRENT_TIMESTAMP)
            ON CONFLICT (username, language_code) DO UPDATE SET
                strings_translated = leaderboard.strings_translated + EXCLUDED.strings_translated,
                exports_count = leaderboard.exports_count + 1,
                last_contribution = CURRENT_TIMESTAMP,
                display_name = EXCLUDED.display_name
        """, (username, display_name, language_code, strings_added))
    else:
        cur.execute("""
            INSERT INTO leaderboard (username, display_name, language_code, strings_translated, exports_count, last_contribution)
            VALUES (?, ?, ?, ?, 1, datetime('now'))
            ON CONFLICT(username, language_code) DO UPDATE SET
                strings_translated = strings_translated + ?,
                exports_count = exports_count + 1,
                last_contribution = datetime('now'),
                display_name = ?
        """, (username, display_name, language_code, strings_added, strings_added, display_name))


def _log_karma(conn, username: str, language_code: str, strings_count: int):
    """Log karma event (called within a transaction)."""
    points = strings_count * 10  # 10 karma points per string
    cur = conn.cursor()
    if _is_pg():
        cur.execute("""
            INSERT INTO karma_events (username, event_type, language_code, strings_count, points, description)
            VALUES (%s, 'translation', %s, %s, %s, %s)
        """, (username, language_code, strings_count, points,
              f"Translated {strings_count} strings in {language_code}"))
    else:
        cur.execute("""
            INSERT INTO karma_events (username, event_type, language_code, strings_count, points, description)
            VALUES (?, 'translation', ?, ?, ?, ?)
        """, (username, language_code, strings_count, points,
              f"Translated {strings_count} strings in {language_code}"))


def get_leaderboard(language_code: str = "", limit: int = 50) -> list[dict]:
    """Get the leaderboard, optionally filtered by language."""
    if not DB_AVAILABLE:
        return []
    conn = _get_conn()
    cur = conn.cursor()

    if language_code:
        cur.execute(
            "SELECT username, display_name, strings_translated, exports_count, last_contribution, rank FROM leaderboard WHERE language_code = ? ORDER BY strings_translated DESC LIMIT ?" if not _is_pg() else
            "SELECT username, display_name, strings_translated, exports_count, last_contribution, rank FROM leaderboard WHERE language_code = %s ORDER BY strings_translated DESC LIMIT %s",
            (language_code, limit))
    else:
        cur.execute(
            "SELECT username, SUM(strings_translated) as total_strings, SUM(exports_count) as total_exports, MAX(last_contribution) as last_seen FROM leaderboard GROUP BY username ORDER BY total_strings DESC LIMIT ?" if not _is_pg() else
            "SELECT username, SUM(strings_translated) as total_strings, SUM(exports_count) as total_exports, MAX(last_contribution) as last_seen FROM leaderboard GROUP BY username ORDER BY total_strings DESC LIMIT %s",
            (limit,))

    results = []
    for i, row in enumerate(cur.fetchall(), 1):
        d = _row_to_dict(row)
        d["rank"] = i
        results.append(d)
    return results


def get_contributor_stats(username: str) -> Optional[dict]:
    """Get detailed stats for a single contributor."""
    if not DB_AVAILABLE:
        return None
    conn = _get_conn()
    cur = conn.cursor()

    # Total strings per language
    cur.execute(
        "SELECT language_code, SUM(strings_translated) as total, SUM(exports_count) as exports FROM leaderboard WHERE username = ? GROUP BY language_code" if not _is_pg() else
        "SELECT language_code, SUM(strings_translated) as total, SUM(exports_count) as exports FROM leaderboard WHERE username = %s GROUP BY language_code",
        (username,))
    by_language = [_row_to_dict(r) for r in cur.fetchall()]

    # Overall totals
    cur.execute(
        "SELECT SUM(strings_translated), SUM(exports_count) FROM leaderboard WHERE username = ?" if not _is_pg() else
        "SELECT SUM(strings_translated), SUM(exports_count) FROM leaderboard WHERE username = %s",
        (username,))
    row = cur.fetchone()
    total_strings = row[0] or 0 if row else 0
    total_exports = row[1] or 0 if row else 0

    # Rank
    cur.execute("""
        SELECT COUNT(*) + 1 FROM (
            SELECT username, SUM(strings_translated) as total
            FROM leaderboard GROUP BY username
            HAVING total > ?
        )
    """ if not _is_pg() else """
        SELECT COUNT(*) + 1 FROM (
            SELECT username, SUM(strings_translated) as total
            FROM leaderboard GROUP BY username
            HAVING total > %s
        ) sub
    """, (total_strings,))
    rank_row = cur.fetchone()
    rank = rank_row[0] if rank_row else 1

    return {
        "username": username,
        "rank": rank,
        "total_strings": total_strings,
        "total_exports": total_exports,
        "by_language": by_language,
    }


# ── App-level stats ───────────────────────────────────────────────────

def get_app_stats() -> dict:
    """Get overall application statistics for the dashboard."""
    if not DB_AVAILABLE:
        return {"total_translations": 0, "total_strings_exported": 0,
                "total_exports": 0, "contributors": 0, "sessions": 0}
    conn = _get_conn()
    cur = conn.cursor()

    # Total translations
    cur.execute("SELECT COUNT(*) FROM translations")
    total_translations = cur.fetchone()[0] or 0

    # Total exports
    cur.execute("SELECT COUNT(*), COALESCE(SUM(strings_added), 0) FROM exports")
    row = cur.fetchone()
    total_exports = row[0] or 0
    total_strings = row[1] or 0

    # Active contributors
    cur.execute("SELECT COUNT(DISTINCT username) FROM leaderboard")
    contributors = cur.fetchone()[0] or 0

    # Sessions
    cur.execute("SELECT COUNT(*) FROM sessions")
    sessions_count = cur.fetchone()[0] or 0

    return {
        "total_translations": total_translations,
        "total_strings_exported": total_strings,
        "total_exports": total_exports,
        "contributors": contributors,
        "sessions": sessions_count,
    }


# ── Helpers ───────────────────────────────────────────────────────────

def _row_to_dict(row) -> dict:
    """Convert a database row to a dict."""
    if row is None:
        return {}
    if hasattr(row, "keys"):
        return dict(row)
    if hasattr(row, "_asdict"):
        return row._asdict()
    # sqlite3.Row supports dict-like access
    try:
        return {k: row[k] for k in row.keys()}
    except Exception:
        return {}


# ── Module init ───────────────────────────────────────────────────────

init_db()
