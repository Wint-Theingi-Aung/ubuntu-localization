# ch-4 Personal Project — Report

## Project

- **GitHub username:** @Wint-Theingi-Aung
- **Repo URL:** https://github.com/Wint-Theingi-Aung/ubuntu-localization
- **Live / download URL:** https://ubuntu-localization.vercel.app
- **License:** MIT
- **One-line summary:** An AI-powered localization tool for translating Ubuntu `.po` files into Burmese, Shan, Mon, and S'gaw Karen indigenous languages using Google Gemini and Claude Code subagent orchestration.

## Product-Intro Slides

- **Slides path:** slides/pitch.md

## Demo Screenshots

- **Resolution used:** 1280×800 desktop and 390×844 mobile

![Landing page — language cards, recent sessions, and CTA](screenshots/desktop-1280x800.png)

![Landing page — mobile responsive view](screenshots/mobile-390x844.png)

![User guide — 6-chapter interactive documentation](screenshots/guide-desktop.png)

![Translate page — upload .po, AI + manual translate, export](screenshots/translate-desktop.png)

![Translate page — with session loaded showing translation workflow](screenshots/translate-session-desktop.png)

## Notes (optional)

- **Running locally:** `uv run uvicorn backend.main:app --reload` → http://localhost:8501
- **Tech stack:** FastAPI + Jinja2 + htmx (Ubuntu-themed UI), Google Gemini 2.5 Flash for AI translations
- **MCP servers:** GitHub MCP, Launchpad Bridge MCP (Launchpad profile/karma/teams/translation progress)
- **Subagent architecture:** `translate-batch` agents run in parallel, `qa-reviewer` agents perform 3-lens adversarial verification (placeholder integrity, Ubuntu context, structural fidelity) with majority-vote gating
- **Supported languages:** Burmese (my), Shan (shn), Mon (mnw), S'gaw Karen (ksw)
- **Deployment:** Vercel with serverless FastAPI (`index.py` entry point)
