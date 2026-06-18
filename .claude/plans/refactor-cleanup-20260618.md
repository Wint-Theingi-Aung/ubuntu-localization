# Refactor Plan: Clean Production SaaS Translation Tool
Date: 2026-06-18

## Summary
Refactor the Ubuntu Localization Tool into a clean, production-ready SaaS-style translation tool with split-mode UX, batch-level validation, pure export (no git), and minimal homepage.

---

## Phase 1: Homepage Cleanup
**File:** `backend/main.py` (dashboard route) + `backend/templates/dashboard.html`

- Remove from homepage: Leaderboard widget, Stats widget, Quick Start section
- Keep: Language cards, Recent Sessions, AI availability warning, footer
- Result: Clean action-focused landing page with CTA to /translate/

---

## Phase 2: /translate Page Redesign (Split Mode UX)
**Files:** `backend/templates/translate.html`, `backend/routers/translate.py`

### TOP SECTION: Main Workflow
- Upload .po file (drag & drop) — keep existing
- Language selection dropdown — keep existing
- Translate button — keep existing
- Batch-based translation (10 strings per page) — already works via `config.items_per_page`

### BOTTOM SECTION: Demo Mode
- "Try with Sample .po file" button
- Auto-loads small sample .po with: "Hello", "Settings", "Shutdown"
- This needs: a new endpoint `/translate/demo` that creates a session with synthetic parsed data

### REMOVE:
- File requirements grid (lines 43-52 of translate.html) → replace with single hint line
- Per-line QA check tags rendering in batch results → show batch summary only

---

## Phase 3: Validation UX Fix
**File:** `backend/routers/translate.py` (batch translate endpoint)

- Change the QA result rendering to show ONLY batch-level summary:
  - "10 strings translated ✔"
  - "0 errors"
  - "Ready to export"
- Remove per-entry check tags (`check-tag pass/fail`, `result-checks` HTML)
- Keep the internal QA logic (still validates) — just change UI rendering

---

## Phase 4: Export System Fix (CRITICAL)
**File:** `backend/routers/translate.py` (export endpoint)

### po-export MUST ONLY:
- Generate .po file (already works via `write_po_file`)
- Return downloadable file (already works via `/translate/download/{filename}`)
- Preserve headers, msgctxt, metadata (already works)

### REMOVE:
- The entire `commit` parameter/form field from export
- All `subprocess.run(["git", ...])` calls in the export route
- Git status checking in the page route
- `git_branch`, `git_clean` template variables
- Manifest file writing (or keep manifest but remove git commit)
- Any /tmp or /var/task export writing assumptions — the config already handles this

### EXPORT BEHAVIOR:
- Modify the export endpoint to NOT require `len(translations) > 0`
- Export should be available even with just 1-3 strings
- The condition `if not parsed or not translations:` should only block if no parsed data exists

---

## Phase 5: Skills & CLAUDE.md Cleanup
**Files:** `.claude/skills/po-export/SKILL.md`, `.claude/CLAUDE.md`

### po-export SKILL.md:
- Remove: "Optionally auto-commits and pushes to GitHub via the GitHub MCP server"
- Remove: "Export & Commit" references
- Remove: "git commit message" references
- Remove: `--no-commit` flag references
- Keep: Pure file generation steps

### CLAUDE.md:
- Update MCP Servers section: remove GitHub MCP auto-commit description
- Update Skills section: po-export description → "Write back to .po file for download"
- Update `/po-export` description

---

## Files Modified (complete list):
1. `backend/main.py` — remove leaderboard/stats/quickstart from dashboard context
2. `backend/templates/dashboard.html` — remove 3 widgets
3. `backend/templates/translate.html` — split mode, remove requirements grid, remove git info
4. `backend/routers/translate.py` — batch summary only, export no-git, demo endpoint, remove git tracking
5. `.claude/skills/po-export/SKILL.md` — remove git/commit references
6. `.claude/CLAUDE.md` — update descriptions

## Files NOT modified:
- `backend/services/po_parser.py` — export logic is sound
- `backend/services/translator.py` — translation/QA logic stays
- `backend/services/session.py` — session management stays
- `backend/services/db.py` — database stays
- `backend/config.py` — config stays
- `backend/routers/export.py` — legacy redirects stay
- `backend/routers/leaderboard.py` — leaderboard page stays (just not on homepage)
- `backend/routers/guide.py` — guide stays
- `backend/templates/base.html` — base layout stays

## Backward Compatibility:
- All existing routes remain functional
- Leaderboard still accessible at /leaderboard/
- Export history still at /export/history
- Guide still at /guide/
