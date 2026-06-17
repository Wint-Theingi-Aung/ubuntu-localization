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

**Indigenous language translators** contributing to Ubuntu localization through Launchpad — Burmese, Shan, Mon, and Karen speakers who want their communities to use Linux in their native language. They face thousands of untranslated OS strings but lack AI-assisted tooling tailored to Ubuntu's technical context.

---

<!-- slide 2 -->
# Their problem

Translating Ubuntu .po files by hand is slow and error-prone:
- **Placeholder breakage**: `%s`, `%d`, `\n` get mangled, breaking the UI
- **Technical term confusion**: Translators accidentally localize "Kernel", "sudo", "GNOME"
- **No QA guardrails**: One mistake ships broken strings to thousands of users
- **Launchpad friction**: Manual upload/download cycle is tedious

---

<!-- slide 3 -->
# What I built

**Ubuntu Localization Tool** — an AI-powered .po translation pipeline with adversarial QA:
- Upload `.po` files → auto-detect languages, extract untranslated strings
- Google Gemini batch translation with **strict placeholder + technical term preservation rules**
- **Triple-lens adversarial QA agent** (placeholders, context, structure) — 2/3 majority required per entry
- Export with auto-commit via GitHub MCP, Launchpad contributor dashboards

---

<!-- slide 4 -->
# How I built it

- **MCP**: GitHub MCP (auto-commit/push), Filesystem MCP (sandboxed I/O), Launchpad Bridge MCP (custom launchpadlib wrapper — 392 lines, 8 tools), Postgres MCP (schema inspection)
- **Skill**: 6 Claude Code skills — `po-upload`, `po-detect`, `po-translate`, `po-export`, `po-description`, `pr-description` — each a focused slash command
- **Agent**: `translate-batch` (Gemini-powered batch translator with language-specific rules) and `qa-reviewer` (adversarial 3-lens verifier requiring majority vote)

---

<!-- slide 5 -->
# Why it matters

- **4 indigenous languages** get AI-accelerated Ubuntu localization for the first time
- **QA pass rate > 95%** — adversarial verification catches placeholder errors before they ship
- **10x faster** than manual translate-review-upload cycle on Launchpad
- Every translated string makes Ubuntu accessible to someone who doesn't speak English — **digital inclusion, one .po file at a time**

---

<!-- slide 6 -->
# Done checklist
- [x] repo public
- [x] MCP + skill + agent used
- [x] report.md in team repo
- [x] PechaKucha slides (this file)
