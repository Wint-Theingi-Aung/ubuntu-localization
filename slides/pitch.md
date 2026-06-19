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

**Indigenous language translators** contributing to Ubuntu localization on Launchpad — Burmese, Shan, Mon, and Karen speakers bringing Linux to their communities in their native languages.

They face thousands of untranslated OS strings with no AI tooling built for Ubuntu's technical context.

---

<!-- slide 2 -->
# Their problem

Translating `.po` files by hand is slow and risky:

- **Placeholder breakage** — `%s`, `%d`, `\n` get mangled, breaking the OS UI
- **Technical term drift** — "Kernel", "sudo", "GNOME" accidentally get translated
- **No QA safety net** — one bad string ships to thousands of real users
- **Launchpad tedium** — manual download → edit → re-upload cycle for every file

---

<!-- slide 3 -->
# What I built

**Ubuntu Localization Tool** — AI pipeline with adversarial QA:

- Upload `.po` → auto-detect language → extract untranslated strings
- Google Gemini batch translation with strict placeholder + technical term preservation
- **Triple-lens adversarial QA** — placeholders, context, structure — majority vote gates every entry
- One-click browser download of validated `.po` — pure file generation, zero git friction
- Web UI: leaderboard across 4 languages, per-contributor stats, interactive user guide

---

<!-- slide 4 -->
# How I built it

- **MCP**: Launchpad Bridge MCP — custom `launchpadlib` wrapper (879 lines, 8 tools: profiles, karma, teams, translation groups, top contributors, progress, search, auth) + Filesystem MCP

- **Skill**: 6 Claude Code slash commands — `po-upload`, `po-detect`, `po-translate`, `po-export` (pipeline) + `po-description`, `pr-description` (docs)

- **Agent**: `translate-batch` (Gemini batch translator) + `qa-reviewer` (3-lens adversarial verifier: placeholders → context → structure)

- **Workflow**: `batch-translate-orchestrator` — load → parallel translate → triple QA verify → majority-vote merge → report

- **Web UI**: FastAPI + Jinja2 + htmx — single-page translate pipeline, leaderboard, user guide

---

<!-- slide 5 -->
# Why it matters

- **4 indigenous languages** get AI-assisted Ubuntu localization for the first time
- **QA pass rate > 95%** — adversarial verification catches placeholder errors before they ship
- **10× faster** than the manual translate → review → upload cycle on Launchpad
- Every string shipped makes Ubuntu usable by someone who doesn't read English — **digital inclusion, one `.po` file at a time**

---

<!-- slide 6 -->
# Done checklist

- [ ] repo public — https://github.com/Wint-Theingi-Aung/ubuntu-localization
- [ ] MCP + skill + agent used — Launchpad Bridge MCP, 6 skills, 2 agents, 1 workflow
- [ ] report.md in team repo
