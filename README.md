# Ubuntu Localization Tool 🐧

An AI-powered localization tool for translating Ubuntu `.po` files into indigenous languages using Google Gemini AI.

## Supported Languages

| Language | Code | Script |
|----------|------|--------|
| Myanmar | `my` | Myanmar Unicode |
| Shan | `shn` | Shan Unicode |
| Mon | `mnw` | Mon Unicode |
| S'gaw Karen | `ksw` | S'gaw Karen Unicode |

## Features

- **Upload** `.po`/`.pot` files via drag-and-drop — language auto-detected from file metadata
- **AI translation** powered by Google Gemini 2.5 Flash with Ubuntu-specific context awareness
- **Batch processing** — translate up to 10 strings at a time with automatic quality checks
- **Manual editing** — side-by-side grid with auto-save on every field
- **Export** — download the translated `.po` file directly from the browser
- **Single-page workflow** — upload, translate, and export all on one unified page
- **Interactive guide** — 6-chapter walkthrough for new translators
- **Contributors** — per-language contributor rankings and stats
- **Templates** — browse 552 Ubuntu packages on Launchpad
- **Glossary** — 101 standardized translation terms across 4 languages
- **Dark/Light theme** — Ubuntu-themed UI with system preference detection
- **i18n** — UI available in English, Myanmar, Shan, Mon, and S'gaw Karen

## Screenshots

![Dashboard — Dark Theme, English](screenshots/dashboard-dark-en.png)
*Dashboard — Dark theme with English UI*

![Templates — Shan](screenshots/template-shan.png)
*Templates page — 552 Ubuntu packages, Shan language*

![Translate — Mon](screenshots/translate-mon.png)
*Translation workspace — AI-powered .po file translation, Mon language*

![Guide — S'gaw Karen](screenshots/guide-karen.png)
*Interactive translation guide — S'gaw Karen language*

![Contributors — Myanmar](screenshots/contributors-mm.png)
*Contributor leaderboard — Myanmar language*

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS 3.4
- **AI**: Google Gemini 2.5 Flash
- **Icons**: Lucide React
- **Deployment**: Vercel

## Folder Structure

```
ubuntu-localization/
├── frontend/                  # Next.js application
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   │   ├── admin/         # Admin glossary moderation
│   │   │   ├── api/           # API routes (auth, upload, translate, export, …)
│   │   │   ├── contributors/  # Contributors leaderboard
│   │   │   ├── get-started/   # Onboarding walkthrough
│   │   │   ├── glossary/      # Translation glossary (+ history)
│   │   │   ├── guide/         # Translation guide
│   │   │   ├── history/       # Translation activity history
│   │   │   ├── templates/     # Ubuntu package browser
│   │   │   └── translate/     # Main translation workspace
│   │   ├── components/        # Reusable React components
│   │   ├── data/              # Static JSON data (translations, glossary, etc.)
│   │   └── lib/               # Utilities (translate, po-parser, i18n, constants)
│   ├── public/                # Static assets
│   ├── __tests__/             # Jest unit tests
│   ├── e2e/                   # Playwright end-to-end tests
│   ├── package.json           # Dependencies and scripts
│   ├── tailwind.config.ts     # Tailwind configuration
│   └── tsconfig.json          # TypeScript configuration
├── .claude/                   # Claude Code configuration
│   ├── agents/                # Subagent definitions (translate-batch, qa-reviewer)
│   ├── skills/                # Slash command skills
│   └── workflows/             # Orchestration workflows
├── screenshots/               # Application screenshots
├── slides/                    # Presentation materials
├── .mcp.json                  # MCP server configuration
└── CLAUDE.md                  # Project instructions for Claude Code
```

## Installation

The environment template lives at the **repository root** (`.env.example`).
Next.js reads `frontend/.env`, so copy the template there before installing
or running frontend commands:

```bash
git clone https://github.com/Wint-Theingi-Aung/ubuntu-localization.git
cd ubuntu-localization

# Create the frontend environment file from the repository-root template
cp .env.example frontend/.env

# Install dependencies
cd frontend
npm install
```

Edit `frontend/.env` and set at least:

```bash
GOOGLE_API_KEY=your_gemini_api_key_here
```

`DATABASE_URL` is optional — without it, features that need storage
(authentication, glossary moderation, history) stay disabled.
`SESSION_SECRET` is not used by the current runtime (session tokens are
random values stored in the database).

## Development

```bash
cd frontend

# Start development server
npm run dev
```

Open **http://localhost:3000** — the app hot-reloads on file changes.

## Testing and Validation

Run these commands from the `frontend/` directory:

```bash
npm run lint
npx jest
npm run build
```

- `npm run lint` runs Next.js linting.
- `npx jest` runs the configured Jest unit tests. There is currently no `test` script in `package.json`.
- Optional browser tests: run `npx playwright install chromium` once, then `npx playwright test`. The Playwright config starts the development server on port 3000. E2E tests may be slower or flaky; do not commit `frontend/test-results/`.
- If you change translation logic, upload a small `.po` file, translate a few strings, export it, and confirm the exported PO still parses.

## Build

Run from `frontend/`:

```bash
npm run build
npm start
```

## MCP Servers and Claude Code Memory

The project-level `.mcp.json` configures MCP servers for Claude Code. Paths in
that file are **project-relative** (no personal home-directory paths). Servers:

- **launchpad-bridge** — in-repo Python server at
  `.claude/mcp-servers/launchpad-bridge/run.sh`. It uses a project `venv/`
  with `launchpadlib` and `mcp`. Create the venv and install dependencies
  before first use; optional OAuth setup is `setup_auth.py` in the same
  directory. Anonymous Launchpad reads work without login.
- **postgres** — `npx -y @modelcontextprotocol/server-postgres` against a
  local `ubuntu_localization` database. Adjust the connection string in
  `.mcp.json` if your database differs.
- **filesystem** — allows the project root and `/tmp/ubuntu-localization`.
- **chrome-devtools** — `npx -y chrome-devtools-mcp@latest`; requires Node.js
  and a compatible Chrome installation.
- **caveman** — `npx -y caveman-mcp`; first run downloads a platform binary.

Optional extras (not in `.mcp.json`):

- **Claude-Mem**: install with `npx claude-mem install` or the Claude Code
  plugin marketplace. Do not hand-add an unverified server command.
- **GitHub MCP**: add your own server if you need repo browsing; this project
  does not ship a GitHub MCP binary or path.

After changing MCP configuration, restart Claude Code and run `/mcp` to check
server status. Only enable servers you trust.

## Deployment (Vercel)

The project is configured for Vercel deployment:

```bash
vercel --prod
```

Set `GOOGLE_API_KEY` as an environment variable in the Vercel dashboard.

## Localization Workflow

1. **Upload** — Drop a `.po` or `.pot` file on the translate page
2. **Translate** — Use AI batch translation or edit manually
3. **QA Check** — Automatic placeholder, newline, and length verification
4. **Export** — Download the translated `.po` file

### CLI Skills (Claude Code)

| Command | Purpose |
|---------|---------|
| `/po-upload` | Parse .po files, extract untranslated strings |
| `/po-detect` | Scan for missing/fuzzy translations, prioritize by visibility |
| `/po-translate` | AI batch translation with 3-reviewer QA verification |
| `/po-export` | Write back to .po file for browser download |
| `/po-description` | Generate human-readable .po file summaries and stats |
| `/pr-description` | Auto-generate structured pull request descriptions |

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/upload` | POST | Parse uploaded .po file |
| `/api/translate` | POST | Batch translate with Gemini AI |
| `/api/export` | POST | Generate downloadable .po file |
| `/api/translation-progress` | GET | Translation session progress |
| `/api/glossary` | GET/POST/PUT/DELETE | Glossary entries and suggestions |
| `/api/history` | GET/POST | Translation activity history |
| `/api/auth/{login,register,logout,me}` | POST/GET | Launchpad OAuth session auth |
| `/api/admin/ui-translations` | — | Admin UI translation management |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, translation guidelines, and the pull request workflow.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
