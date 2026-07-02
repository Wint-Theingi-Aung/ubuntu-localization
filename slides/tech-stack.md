<!--
  Marp template — "terminal-dark"
  Render:  marp slides/tech-stack.md -o slides/tech-stack.html
-->
---
marp: true
paginate: true
size: 16:9
---

<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;600;800&display=swap');
:root {
  --bg:#0d1117; --ink:#e6edf3; --muted:#8b949e;
  --accent:#3fb950; --accent2:#58a6ff; --line:#30363d; --code:#161b22;
}
section {
  background:var(--bg); color:var(--ink);
  font-family:'Inter','Noto Sans','Pyidaungsu',sans-serif;
  font-size:27px; line-height:1.5; padding:56px 72px;
}
h1,h2,h3 { font-family:'JetBrains Mono',monospace; }
h1 { color:var(--accent); font-weight:700; border-bottom:3px solid var(--line); padding-bottom:.2em; }
h2 { color:var(--accent2); font-weight:500; }
h3 { color:var(--ink); }
strong { color:var(--accent); }
a { color:var(--accent2); text-decoration:none; }
code { background:var(--code); color:var(--accent); padding:.06em .35em; border-radius:5px; font-family:'JetBrains Mono',monospace; }
pre  { background:var(--code); border:1px solid var(--line); border-radius:10px; }
pre code { background:none; color:#e6edf3; }
blockquote { border-left:4px solid var(--accent); background:#11161d; color:var(--muted); padding:.5em 1em; }
table th { background:#161b22; color:var(--accent2); }
table td, table th { border-color:var(--line); }
header,footer,section::after { color:var(--muted); font-size:.5em; }
section.cover {
  background:radial-gradient(900px 400px at 80% 12%, rgba(63,185,80,.18), transparent 60%), var(--bg);
}
section.cover h1 { border-bottom:none; font-size:2.3em; }
section.cover .tags code { background:#11161d; color:var(--accent2); margin-right:.4em; }
section.lead { background:#11161d; }
section.lead h1 { border-bottom:none; }
</style>

<!-- _class: cover -->

# Ubuntu Localization — Tech Stack

## How the project is built

**Wint Theingi Aung** · @Wint-Theingi-Aung

<span class="tags">`#claude-code` `#gemini` `#nextjs` `#mcp` `#agents` `#skills`</span>

---

# Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) + React 18 + TypeScript |
| **Styling** | Tailwind CSS 3.4 |
| **AI Engine** | Google Gemini 2.5 Flash |
| **Icons** | Lucide React |
| **Deployment** | Vercel |
| **Data** | Launchpad API (live) + local `.po` files |
| **MCP Servers** | GitHub MCP · Launchpad Bridge MCP |
| **Orchestration** | Claude Code Skills + Subagents + Workflows |

---

# Agents

Two specialized subagents handle translation and quality:

### `translate-batch` — Gemini Translator
- Input: JSON `{target_lang, entries[{index, msgid, msgctxt}]}`
- Output: JSON `{translations[{index, msgid, translated}]}`
- Rules: placeholder preservation (`%s`, `%d`), technical term lock, language-specific scripts

### `qa-reviewer` — 3-Lens Adversarial Verifier
- **Lens 1:** Placeholder & format integrity
- **Lens 2:** Ubuntu context & semantic accuracy
- **Lens 3:** Structural & whitespace fidelity
- **Majority vote:** 2/3 lenses must pass per entry

---

# Skills

Six Claude Code slash commands power the pipeline:

| Skill | Purpose |
|-------|---------|
| `/po-upload` | Parse `.po` files, extract untranslated strings |
| `/po-detect` | Scan for missing/fuzzy translations, prioritize by importance |
| `/po-translate` | AI batch translation with 3-reviewer QA verification |
| `/po-export` | Write back to `.po` file for download |
| `/po-description` | Generate human-readable `.po` summaries and priority breakdowns |
| `/pr-description` | Auto-generate structured PR descriptions for Launchpad contributions |

Each skill is a markdown prompt file in `.claude/skills/`.

---

# Methodology

### 5-Phase Pipeline (batch-translate-orchestrator)

```
Phase 1  Load session data + translation queue
Phase 2  Parallel translate-batch agents (schema-constrained JSON)
Phase 3  Triple qa-reviewer adversarial verification per entry
Phase 4  Majority-vote merge (passed/failed split)
Phase 5  Report with pass/fail stats and next-action links
```

**Key principle:** Every translation goes through 3 independent QA lenses.
A string passes only if **≥2 out of 3** reviewers approve.
Failed strings are flagged for human review — not silently dropped.

---

# Trigger

How the pipeline gets started:

| Trigger | How |
|---------|-----|
| **Web UI** | Upload `.po` at `/translate/` → click "Translate" → runs full pipeline |
| **Slash command** | `/po-translate --priority=p1` in Claude Code CLI |
| **Orchestrator workflow** | `batch-translate-orchestrator` runs automatically inside `/po-translate` |
| **Manual agent call** | Spawn `translate-batch` or `qa-reviewer` agents directly |

The web UI and CLI share the same underlying agents and workflow — same quality, different entry points.

---

# Commands

Quick-start from the terminal:

```bash
# Frontend (Next.js)
cd frontend && npm install
npm run dev          # → http://localhost:3000

# Claude Code slash commands
/po-upload data/myanmar_messages.po
/po-detect
/po-translate --priority=p1
/po-export
```

### MCP Server Setup
```bash
# Launchpad Bridge (custom MCP)
python ~/.claude/mcp-servers/launchpad-bridge/setup_auth.py
# Anonymous read access works without setup
```

### Vercel Deploy
Set `GOOGLE_API_KEY` in Vercel dashboard → push to `main` → auto-deploy.

---

<!-- _class: cover -->

# That's the stack

**Skills** trigger **Agents** run by **Workflows** powered by **Gemini** — all inside **Claude Code**.

Repo → https://github.com/Wint-Theingi-Aung/ubuntu-localization
Live → https://ubuntu-localization.vercel.app/
