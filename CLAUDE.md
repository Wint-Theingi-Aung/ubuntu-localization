# Ubuntu Localization Tool — AI-Enhanced

## Project Overview
A localization tool for translating Ubuntu `.po` files into indigenous languages using Google Gemini AI, Claude Code skills, MCP servers, and subagent orchestration.

## Languages
- Myanmar (my), Shan (shn), Mon (mnw), S'gaw Karen (ksw)

## Skills (Claude Code Slash Commands)
Slash-command skills live in `.claude/skills/`; each `SKILL.md` carries its own
`name` and `description`, so invoke by name or let Claude route by description.

## MCP Servers
- **GitHub MCP** — Repository access for file browsing (read-only)
- **Launchpad Bridge MCP** — Custom MCP server wrapping launchpadlib
  - 8 tools: auth check, profile, karma, teams, translation groups, top contributors, search, progress
  - Setup: `python ~/.claude/mcp-servers/launchpad-bridge/setup_auth.py`
  - Source: `.claude/mcp-servers/launchpad-bridge/server.py`
  - Anonymous read access works without setup

## Subagent Architecture
- `translate-batch` — Gemini batch translator (`.claude/agents/translate-batch.md`)
- `qa-reviewer` — 3-lens adversarial verifier; 2/3 majority vote per entry (`.claude/agents/qa-reviewer.md`)
- `batch-translate-orchestrator` — Load → parallel translate → triple QA verify → merge → report (`.claude/workflows/batch-translate-orchestrator.js`)

I/O JSON contracts and the full phase list live in those files.

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
- **Production URL**: https://ubuntu-localization.vercel.app/
- Entry point: `frontend/` directory (Next.js)

Set the Gemini key via CLI:
```bash
echo "YOUR_KEY" | vercel env add GOOGLE_API_KEY production
echo "YOUR_KEY" | vercel env add GOOGLE_API_KEY preview
echo "YOUR_KEY" | vercel env add GOOGLE_API_KEY development
```

> **Note:** Without `GOOGLE_API_KEY`, the translation page shows "Google API key not configured" error. Both production and preview deployments require this variable.

