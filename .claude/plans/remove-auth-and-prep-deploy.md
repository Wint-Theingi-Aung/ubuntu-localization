# Plan: Remove Login UI + Prep for Free Deployment

## Discovery Summary

The project has **two completely separate systems**:

| System | Location | Purpose | Runs in |
|--------|----------|---------|---------|
| **Web App** (FastAPI) | `backend/` | Upload → translate → export .po files | Browser (Vercel/Railway) |
| **Skills/MCP/Subagents** | `.claude/agents/`, `.claude/workflows/` | CLI translation orchestration | Claude Code terminal |

### Key finding: Removing login has ZERO effect on skills/MCP/subagents
- Skills (`/po-upload`, `/po-translate`, etc.) are Claude Code slash commands — they don't use the web app's auth
- MCP servers are CLI-side config — unrelated to web app routes
- Subagents (`translate-batch`, `qa-reviewer`) run inside Claude Code workflows
- The web app and CLI are completely independent

### What the web app actually depends on:
- **File-based sessions** (`session.py`): JSON in `~/.cache/` — this IS the core, everything uses it
- **SQLite/Postgres DB** (`db.py`): Stats, leaderboard, export history — supplementary tracking
- **Gemini API**: Translation engine in `translator.py`

---

## Task 1: Remove Login / Auth Pages

**Files to change:**
- `backend/main.py` — remove `auth` router import and `app.include_router(auth.router)`
- `backend/templates/base.html` — remove "🔐 Profile" nav item (line ~859-861) and auth widget CSS
- `backend/templates/dashboard.html` — remove auth widget `hx-get` (line ~6)
- `backend/routers/auth.py` — keep file but mark as unused (or delete)
- `backend/templates/login.html` — delete file
- `backend/templates/profile.html` — keep (still used by leaderboard contributor links)

**No changes needed to:** `.claude/agents/`, `.claude/workflows/`, MCP servers

## Task 2: Make Database Optional (Graceful Degradation)

Without this, the app crashes on Vercel (no persistent SQLite).

**Files to change:**
- `backend/services/db.py` — add `DB_AVAILABLE` flag, wrap init in try/except
- `backend/main.py` — wrap `db.*` dashboard calls in try/except, fall back to empty data
- `backend/routers/export.py` line ~139 — wrap `db.log_export()` in try/except
- `backend/routers/leaderboard.py` — wrap `db.*` calls in try/except

**Behavior when DB unavailable:**
- Dashboard: Shows file-based sessions, skips DB stats/leaderboard
- Export: Saves .po file, skips DB logging
- Leaderboard page: Shows "Database not available" message

## Task 3: Gemini Model Strategy

**Current:** `gemini-2.0-flash-lite` (free tier, 15 RPM)
- Rate limits are a free-tier limitation, not model-specific
- Changing model to `gemini-2.0-flash` still free but same 15 RPM cap
- The code already handles 429 errors with retry logic

**Change:** 
- Add `GEMINI_MODEL` as a configurable env var (already exists in config.py)
- Update model to `gemini-2.5-flash` (newer, better quality, still free tier)
- Keep the retry/backoff logic — it already handles rate limits well

## Task 4: Deployment Recommendations

### Best Match: **Railway**
- Free tier with $5 credit/month
- Persistent volume support → SQLite works as-is
- Full FastAPI support
- Custom domains on free tier
- **No code changes needed** (just set env vars)

### Second Option: **Vercel** (after Task 2)
- Free tier, serverless
- No persistent disk → SQLite fails → DB must be optional
- Need Supabase/Neon for database features (free tiers available)
- Custom domains supported

### Not Suitable: **GitHub Pages**
- Static only, can't run FastAPI

---

## What Stays Untouched

- ✅ `.claude/agents/` — translate-batch, qa-reviewer subagents
- ✅ `.claude/workflows/` — batch-translate-orchestrator
- ✅ MCP servers (GitHub, Launchpad Bridge, Filesystem)
- ✅ All Claude Code slash commands (`/po-upload`, `/po-translate`, etc.)
- ✅ Core translation workflow (upload → parse → translate → export)
- ✅ File-based session system
- ✅ Guide, Leaderboard pages
