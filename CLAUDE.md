# Ubuntu Localization Tool — AI-Enhanced

## Project Overview
A localization tool for translating Ubuntu `.po` files into indigenous languages using Google Gemini AI, Claude Code skills, MCP servers, and subagent orchestration.

## Languages
- Myanmar (my), Shan (shn), Mon (mnw), S'gaw Karen (ksw)

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS 3.4
- **AI**: Google Gemini 2.5 Flash
- **Icons**: Lucide React
- **Deployment**: Vercel

## Web UI (Next.js)
```
cd frontend
npm run dev
→ http://localhost:3000
```

| Route | Purpose |
|-------|---------|
| `/` | Dashboard — language overview, quick actions, recent activity |
| `/translate/` | Unified pipeline: upload .po → AI + manual translate → export |
| `/templates/` | Browse 550+ Ubuntu packages on Launchpad |
| `/glossary/` | 153 standardized translation terms |
| `/guide/` | 6-chapter interactive user guide |
| `/guide/quickref` | Quick reference card |
| `/contributors/` | Top contributors, per-language rankings |
| `/history/` | Export history |

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/upload` | POST | Parse uploaded .po file |
| `/api/translate` | POST | Batch translate with Gemini AI |
| `/api/export` | POST | Generate downloadable .po file |
| `/api/progress` | GET/POST | Translation session progress |

## Skills (Claude Code Slash Commands)
- `/po-upload` — Parse .po files, extract untranslated strings
- `/po-detect` — Scan for missing/fuzzy translations, prioritize by importance
- `/po-translate` — AI batch translation with 3-reviewer QA verification
- `/po-export` — Write back to .po file for download from the unified translate page
- `/po-description` — Generate human-readable .po file summaries and priority breakdowns
- `/pr-description` — Auto-generate structured pull request descriptions for translation contributions

## MCP Servers
- **GitHub MCP** — Repository access for file browsing (read-only)
- **Launchpad Bridge MCP** — Custom MCP server wrapping launchpadlib
  - 8 tools: auth check, profile, karma, teams, translation groups, top contributors, search, progress
  - Setup: `python ~/.claude/mcp-servers/launchpad-bridge/setup_auth.py`
  - Source: `.claude/mcp-servers/launchpad-bridge/server.py`
  - Anonymous read access works without setup

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

## Key Source Files
- `frontend/src/lib/translate.ts` — Gemini API client + QA verification
- `frontend/src/lib/po-parser.ts` — .po file parser and generator
- `frontend/src/lib/constants.ts` — Languages, URLs, config
- `frontend/src/lib/i18n.tsx` — UI internationalization (5 languages)
- `frontend/src/app/translate/page.tsx` — Main translation workspace
- `frontend/src/components/Sidebar.tsx` — Navigation sidebar

## Deployment (Vercel)
- Entry point: `frontend/` directory (Next.js)

### Required Environment Variables
| Variable | Purpose | Where |
|----------|---------|-------|
| `GOOGLE_API_KEY` | Gemini AI translation API | Vercel dashboard + `.env` locally |

Set via CLI:
```bash
echo "YOUR_KEY" | vercel env add GOOGLE_API_KEY production
echo "YOUR_KEY" | vercel env add GOOGLE_API_KEY preview
echo "YOUR_KEY" | vercel env add GOOGLE_API_KEY development
```

> **Note:** Without `GOOGLE_API_KEY`, the translation page shows "Google API key not configured" error. Both production and preview deployments require this variable.

## Quick Start
1. `cd frontend && npm install`
2. Set `GOOGLE_API_KEY` in `frontend/.env`
3. `npm run dev`
4. Open http://localhost:3000/translate/ — upload, translate, and download exported .po
