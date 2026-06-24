# Ubuntu Localization Tool — AI-Enhanced

## Project Overview
A localization tool for translating Ubuntu `.po` files into indigenous languages using Google Gemini AI, Claude Code skills, MCP servers, and subagent orchestration.

## Languages
- Myanmar (my), Shan (shn), Mon (mnw), S'gaw Karen (ksw)

## Tech Stack
- **Web UI**: FastAPI + Jinja2 + htmx (Ubuntu-themed)
- **Legacy UI**: Streamlit (`streamlit_app.py` — still available)
- **AI**: Google Gemini 2.5 Flash
- **Package Manager**: uv (available in requirements.txt)

## Web UI (FastAPI)
```
uv run uvicorn backend.main:app --reload
→ http://localhost:8501
```

| Route | Purpose |
|-------|---------|
| `/` | Landing page — language cards, recent sessions, CTA to translate |
| `/translate/` | Unified pipeline: upload .po → AI + manual translate → export |
| `/export/history` | Export history |
| `/guide/` | 6-chapter interactive user guide |
| `/guide/quickref` | Quick reference card |
| `/leaderboard/` | Top contributors, per-language rankings |
| `/leaderboard/contributor/{name}` | Individual contributor stats |
| `/auth/` | Launchpad login, profile, karma, teams |
| `/health` | Health check endpoint |

## Skills (Claude Code Slash Commands)
- `/po-upload` — Parse .po files, extract untranslated strings
- `/po-detect` — Scan for missing/fuzzy translations, prioritize by importance
- `/po-translate` — AI batch translation with 3-reviewer QA verification
- `/po-export` — Write back to .po file for download from the unified translate page
- `/po-description` — Generate human-readable .po file summaries and priority breakdowns
- `/pr-description` — Auto-generate structured pull request descriptions for translation contributions

## MCP Servers
- **GitHub MCP** — Repository access for file browsing (read-only)
- **Filesystem MCP** — Safe file I/O restricted to project directory
- **Launchpad Bridge MCP** — Custom MCP server wrapping launchpadlib
  - 8 tools: auth check, profile, karma, teams, translation groups, top contributors, search, progress
  - Setup: `python ~/.claude/mcp-servers/launchpad-bridge/setup_auth.py`
  - Source: `~/.claude/mcp-servers/launchpad-bridge/server.py` (392 lines)
  - Anonymous read access works without setup
  - Authenticated access enables Launchpad profile dashboard at `/auth/`

## Subagent Architecture ✅ ACTIVE
- `translate-batch` — Gemini batch translator (`.claude/agents/translate-batch.md`)
  - Input: JSON `{target_lang, lang_code, entries[{index, msgid, msgctxt}]}`
  - Output: JSON `{translations[{index, msgid, translated}]}`
  - Rules: placeholder preservation, technical term lock, language-specific scripts
- `qa-reviewer` — 3-lens adversarial verifier (`.claude/agents/qa-reviewer.md`)
  - Lens 1: Placeholder & format integrity
  - Lens 2: Ubuntu context & semantic accuracy
  - Lens 3: Structural & whitespace fidelity
  - Majority vote: 2+/3 passes required per entry
- `batch-translate-orchestrator` — Pipeline workflow (`.claude/workflows/batch-translate-orchestrator.js`)
  - Phase 1: Load session data + translation queue
  - Phase 2: Parallel translate-batch agents (schema-constrained JSON output)
  - Phase 3: Triple qa-reviewer adversarial verification per entry
  - Phase 4: Majority-vote merge (passed/failed split)
  - Phase 5: Report with pass/fail stats and next-action links

## Usage Example
```
/po-upload data/myanmar_messages.po
/po-detect
/po-translate --priority=p1
# This invokes batch-translate-orchestrator workflow internally:
#   Load → Parallel Translate → Triple QA Verify → Merge → Report
/po-export  # Pure file generation, downloadable .po
```

## Deployment (Vercel)
- Entry point: `index.py` — imports the FastAPI app from `backend.main`
- Set `GOOGLE_API_KEY` and `SECRET_KEY` as environment variables in Vercel dashboard
- Exports and sessions auto-store in `/tmp` (the only writable directory on Vercel)

## Quick Start
1. `uv sync` or `pip install -r requirements.txt`
2. Set `GOOGLE_API_KEY` in `.env`
3. `uv run uvicorn backend.main:app --reload`
4. Open http://localhost:8501/translate/ — upload, translate, and download exported .po
