---
marp: true
paginate: true
transition: fade
# PechaKucha: 6 slides, 20s auto-advance. Do not change the count.
auto-advance: 20
---

<!-- slide 1 -->
# Who's my person?
<!-- 20s -->

**Ubuntu translators** — volunteers and language teams translating Ubuntu into
indigenous languages: **Myanmar, Shan, Mon, S'gaw Karen**.

They work through Launchpad, Ubuntu's translation platform. They're passionate
about bringing open-source software to their communities, but they face:

- Thousands of untranslated strings per .po file
- Weeks of manual effort for a single release
- No tooling for quality assurance beyond spot-checks

---

<!-- slide 2 -->
# Their problem
<!-- 20s -->

**Manual translation doesn't scale.** A single Ubuntu .po file contains
500–5,000+ strings. Translation volunteers:

- Spend **hours copy-pasting** strings through Google Translate
- Have **no systematic QA** — placeholder breakage (`%s` → `%S`) ships to users
- Can't track **who translated what** or measure progress over time
- Have **no pipeline** from translation → review → export → Launchpad PR

The result: critical Ubuntu UI ships **untranslated or broken** for millions of
indigenous language speakers.

---

<!-- slide 3 -->
# What I built
<!-- 20s -->

**An AI-powered Ubuntu localization pipeline** — slash commands, subagents,
and a web UI that turn weeks of manual translation into minutes.

| Feature | What it does |
|---------|-------------|
| `/po-upload` | Parse .po files, extract untranslated strings |
| `/po-detect` | Prioritize by importance, detect fuzzy/missing |
| `/po-translate` | Batch AI translation with **3-reviewer QA** |
| `/po-export` | Write back clean .po, ready for Launchpad |
| **Web UI** | Ubuntu-themed FastAPI + htmx dashboard |
| **Leaderboard** | Per-language contributor rankings via Launchpad |

**4 indigenous languages supported** with Unicode-correct scripts and
language-specific grammar rules (SOV vs SVO, tone marks, script families).

---

<!-- slide 4 -->
# How I built it
<!-- 20s -->

**MCP Server:** Custom **Launchpad Bridge** (392-line Python server)
- Wraps launchpadlib → 8 MCP tools
- Profile, karma, teams, translation groups, top contributors, progress
- Powers `/auth/` dashboard and leaderboard from live Launchpad data

**Skills (Slash Commands):** 6 Claude Code skills
- `/po-upload`, `/po-detect`, `/po-translate`, `/po-export`, `/po-description`, `/pr-description`

**Agents & Workflow:**
- `translate-batch` → Gemini 2.5 Flash, schema-constrained JSON output
- `qa-reviewer` → 3 adversarial lenses (placeholders, context, structure)
- `batch-translate-orchestrator` → 5-phase pipeline: Load → Translate → Verify → Merge → Report

**Stack:** FastAPI + Jinja2 + htmx · Google Gemini · Vercel deployment

---

<!-- slide 5 -->
# Why it matters
<!-- 20s -->

**Ubuntu is the world's most popular Linux distribution.** Over 6 million
desktop users, plus countless servers and cloud instances.

Indigenous language speakers — **33 million Myanmar, 3.3 million Shan,
1 million Mon, 7 million Karen** — currently use Ubuntu in English because
translations don't exist or are incomplete.

This tool:

- **10× faster** translation (minutes, not weeks)
- **Higher quality** via adversarial QA (3 reviewers, majority vote)
- **Community-owned** — open source, Launchpad-integrated, contributor-tracked
- **Repeatable pipeline** — every Ubuntu release can be localized on day one

**Language preservation meets open-source accessibility.**

---

<!-- slide 6 -->
# Done checklist
<!-- 20s -->

- [x] **Repo public** — https://github.com/Wint-Theingi-Aung/ubuntu-localization
- [x] **MCP used** — Launchpad Bridge (custom, 8 tools) + GitHub MCP + Filesystem MCP
- [x] **Skill used** — 6 slash commands: po-upload, po-detect, po-translate, po-export, po-description, pr-description
- [x] **Agents used** — translate-batch (Gemini translator) + qa-reviewer (3-lens adversarial QA)
- [x] **Workflow used** — batch-translate-orchestrator (5-phase pipeline with parallel translation + majority-vote verification)
- [x] **Web UI** — Ubuntu-themed FastAPI + htmx dashboard with leaderboard and auth
- [x] **Deployed** — Vercel with `/tmp`-based persistence
- [ ] `report.md` in team repo
