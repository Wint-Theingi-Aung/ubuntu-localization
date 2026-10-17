# Contributing to the Ubuntu Localization Tool

Thank you for your interest in contributing! This project translates Ubuntu
`.po` files into indigenous languages — Myanmar, Shan, Mon, and S'gaw Karen.
Every contribution helps more people use Ubuntu in their own language, and
**first-time contributors are very welcome.**

You do not need to be a developer to help. Translating strings, improving the
glossary, reporting bugs, and fixing documentation are all valuable.

- **Repository**: <https://github.com/Wint-Theingi-Aung/ubuntu-localization>
- **License**: MIT

---

## Ways to Contribute

| Type of contribution | What it looks like |
|----------------------|--------------------|
| **Translations** | Translate or review `.po` strings; fill in missing glossary terms |
| **Bug reports** | Tell us what is broken, with steps to reproduce |
| **Feature requests** | Suggest improvements to the tool or the workflow |
| **Documentation** | Fix errors in `README.md`, the in-app guide, or this guide |
| **Code** | Fix bugs, improve the UI, or extend the translation pipeline |

---

## Reporting Bugs and Requesting Features

Please [open a GitHub issue](https://github.com/Wint-Theingi-Aung/ubuntu-localization/issues)
on the repository.

**For a bug report**, include:

- What you did, what you expected, and what actually happened
- Steps to reproduce the problem
- The language you were working in (`my`, `shn`, `mnw`, or `ksw`)
- The relevant `.po` file or the exact string, if you can share it
- Your environment (browser, operating system, Node version if relevant)

**For a feature request**, describe the problem you are trying to solve and
your idea. If you have already tried to solve it yourself, say what you tried.

For general discussion about Ubuntu translation, the project also points to the
[Ubuntu Translators team on Launchpad](https://translations.launchpad.net/ubuntu),
which is a good place to ask for help with your language.

---

## Prerequisites

- **Node.js 18 or newer** (see `engines` in `frontend/package.json`)
- **npm** (bundled with Node.js)
- A **Google Gemini API key** if you want to test AI translation
  (the rest of the app works without it)
- Optional: a **Neon PostgreSQL** database if you want to test the features
  that need storage (authentication, glossary moderation, history)
- Optional: **Claude Code** if you want to use the project's translation
  slash-commands and subagents

Check your versions:

```bash
node --version   # must be >= 18
npm --version
```

---

## Local Development Setup

```bash
# 1. Clone your fork (see "Git Workflow" below)
git clone https://github.com/<your-username>/ubuntu-localization.git
cd ubuntu-localization

# 2. Create the frontend environment file (template is at repository root)
cp .env.example frontend/.env

# 3. Install dependencies (run from frontend/)
cd frontend
npm install
```

The `.env.example` template lives at the **repository root**, but Next.js
reads environment variables from `frontend/.env` — so the copy target is
`frontend/.env`, not `.env` inside `frontend/`. Always run frontend commands
from `frontend/` after that copy.

Then edit `frontend/.env` and fill in the values you need:

```bash
# Google Gemini API key — enables AI translation
GOOGLE_API_KEY=your_gemini_api_key_here

# Neon PostgreSQL connection string — enables auth, glossary, and history
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

> **Never commit `.env`** — it is already listed in `.gitignore`. Replace the
> values above with your own. `SESSION_SECRET` is not required: session tokens
> are generated with `crypto.randomBytes(32)` and stored in the
> `user_sessions` table (`createSession()` in `frontend/src/lib/db.ts`).

### Start the app

```bash
cd frontend
npm run dev
```

Open **http://localhost:3000**. The app hot-reloads as you edit files.

### Production build

```bash
cd frontend
npm run build
npm start
```

### What each page does

| Route | Purpose |
|-------|---------|
| `/` | Dashboard |
| `/translate/` | Upload `.po` → translate (AI or manual) → export |
| `/templates/` | Browse Ubuntu packages on Launchpad |
| `/glossary/` | Standardized translation terms |
| `/glossary/history/` | Glossary change history |
| `/guide/` | Interactive translator guide |
| `/guide/quickref/` | Condensed quick-reference sheet |
| `/get-started/` | Onboarding walkthrough for new translators |
| `/contributors/` | Contributor rankings |
| `/history/` | Translation activity history (uploads, translations, exports) |
| `/admin/glossary/` | Glossary moderation (admin access required) |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/           # Next.js App Router pages and API routes
│   ├── components/    # Reusable React components
│   ├── data/          # Static JSON — glossary, i18n strings, templates
│   │   ├── glossary.json
│   │   └── i18n/      # en.json, my.json, shn.json, mnw.json, ksw.json
│   └── lib/           # Utilities
│       ├── translate.ts    # Gemini client + automated QA checks
│       ├── po-parser.ts    # .po parsing and generation
│       ├── constants.ts    # Languages, URLs, config
│       └── i18n.tsx        # UI internationalization
├── __tests__/         # Jest unit tests
└── e2e/               # Playwright end-to-end tests
```

---

## Translation Guidelines

This tool supports four languages:

| Language | Code | Script | Word order |
|----------|------|--------|------------|
| Myanmar | `my` | Myanmar Unicode | SOV |
| Shan | `shn` | Shan Unicode | SVO |
| Mon | `mnw` | Mon Unicode | SVO |
| S'gaw Karen | `ksw` | S'gaw Karen Unicode | SVO |

### Language-specific checks

- **Myanmar (`my`)** — Use **Unicode, never Zawgyi**. Check tone markers.
- **Shan (`shn`)** — Preserve tone marks; do not substitute Shan characters
  with visually similar Myanmar ones.
- **Mon (`mnw`)** — Use Mon-specific characters; do not substitute Myanmar
  equivalents.
- **S'gaw Karen (`ksw`)** — Use Karen script and natural SVO word order.

### What must never be translated or modified

These are the hard rules. Breaking them can crash Ubuntu applications or make
them unusable.

1. **Placeholders and format specifiers** — copy them exactly:
   - Simple: `%s`, `%d`, `%f`, `%u`, `%c`
   - With length: `%ld`, `%lu`, `%lld`, `%zu`
   - With flags/width/precision: `%02d`, `%-20s`, `%.16s`, `%.*s`
   - Named: `%(name)s`, `%(count)d`
   - Positional: `%1$s`, `%2$d`
   - Literal percent: `%%` (keep as `%%`)
2. **Mnemonic underscores** — an underscore plus one letter marks a keyboard
   shortcut (e.g. `_Edit Selected Profile` → the `_E` stays exactly as-is).
3. **HTML and XML tags** — translate only the text between tags; never rename,
   add, or remove tags. Keep tags correctly matched. Preserve entities
   (`&amp;`, `&#160;`, `&lt;`).
4. **Escapes and whitespace** — `\n`, `\t`, `\"`, `\\` and the leading/trailing
   whitespace of the string must match the source.
5. **Ubuntu and technical terms** — keep in English, for example:
   `Ubuntu`, `Canonical`, `Debian`, `GNOME`, `Firefox`, `LibreOffice`,
   `Kernel`, `sudo`, `apt`, `GRUB`, `systemd`, `dbus`, `X11`, `Wayland`,
   `ext4`, `Btrfs`, `LVM`, `DHCP`, `DNS`, `SSH`, `VPN`, `TCP`,
   `PulseAudio`, `PipeWire`, `AppArmor`.
6. **Code, brand names, and symbols** — leave unchanged.

### Style guidance

- **Menu items and button labels**: short, clear, imperative form.
- **Help text and descriptions**: natural, explanatory language.
- **Error messages**: clear, actionable, and respectful.
- Keep register consistent — formal for menus, conversational for help text.

### Working with the glossary

The glossary at `frontend/src/data/glossary.json` holds standardized terms so
the same concept is translated the same way everywhere. Each entry looks like:

```json
{ "id": 2, "en": "Application", "my": "အပလီကေးရှင်း", "shn": "လုၵ်ႈတီႇၶိုၼ်ႈ", "mnw": "အပလီကောန်ဍုၚ်", "ksw": "" }
```

When contributing glossary terms:

- Follow the existing format and keep the `id` scheme consistent.
- Fill in only the languages you are confident about; leave others empty
  rather than guessing.
- Prefer a new entry over contradicting an existing one — open an issue if you
  think an existing term is wrong.

### Working with UI strings

The interface itself is translated in `frontend/src/data/i18n/`, one flat
`key → string` JSON file per language (`en`, `my`, `shn`, `mnw`, `ksw`). If you
add a new UI string, add it to every language file (use the English text as a
placeholder if you do not have a translation).

---

## AI-Assisted Translation — Human Review Is Required

The tool can translate automatically with Google Gemini, and Claude Code users
can run the `/po-upload`, `/po-detect`, `/po-translate`, and `/po-export`
skills, which use the `translate-batch` and `qa-reviewer` subagents.

**AI output is never acceptable on its own.** Automated checks catch broken
placeholders, but they cannot judge meaning. Every AI-generated translation
must be reviewed by a human before it is accepted or submitted to Launchpad.

When reviewing AI output, check:

- **Accuracy** — does it mean what the English source means?
- **Natural language** — would a native speaker say it this way?
- **Terminology** — does it match the glossary and the rest of the UI?
- **Placeholders** — are every placeholder, mnemonic, and tag intact?

### Automated QA already in the codebase

`verifyTranslation()` in `frontend/src/lib/translate.ts` runs these checks on
each string:

| Check | Rule |
|-------|------|
| Format Specifiers | printf, named, positional, and brace placeholders must match |
| Mnemonic Underscores | every `_X` must survive unchanged |
| Newline Count | `\n` count must match the source |
| Non-Empty | the translation must not be blank |
| Length Ratio | target length within **0.3x–4.0x** of the source |

The `qa-reviewer` subagent adds a three-lens adversarial review (placeholder
integrity, Ubuntu context, structural fidelity) requiring **2 of 3 lenses to
pass** per entry.

A passing automated check is a floor, not a guarantee — still read the
translation yourself.

---

## Code Contribution Guidelines

- **Follow the existing architecture.** Keep Next.js App Router conventions,
  and place code in the matching directory (`app/`, `components/`, `lib/`,
  `data/`).
- **Match the surrounding style.** Note the naming conventions and comment
  density of the file you are editing, and stay consistent.
- **Reuse existing utilities.** For example, use the helpers in
  `frontend/src/lib/constants.ts` for language and Launchpad URLs instead of
  hardcoding them.
- **Keep changes focused.** Avoid unrelated refactors, reformatting, or
  "drive-by" edits in the same PR — they make reviews much harder.
- **Do not commit secrets, build output, or lockfile churn** you did not
  intend (`.env`, `.next/`, `node_modules/` are all gitignored).
- **Update the documentation** if your change alters behavior users rely on.

---

## Testing and Validation

All commands below run from the **`frontend/`** directory.

### 1. Lint (run this on every code change)

```bash
npm run lint
```

This runs `next lint`. It should report no errors.

### 2. Unit tests (Jest)

The project has Jest configured, but there is **no `test` script** in
`package.json`, so run it directly:

```bash
npx jest
```

You can narrow the run:

```bash
npx jest --watch              # re-run on save
npx jest po-launchpad-compat  # one test file
```

Unit tests live in `frontend/__tests__/*.test.ts` and cover Launchpad
compatibility of the `.po` output, batch translation validation, glossary
moderation and suggestion dates, and auth logout.

### 3. End-to-end tests (Playwright, optional)

E2E tests live in `frontend/e2e/`. The Playwright config starts the dev server
for you on port 3000, but you need browsers installed once:

```bash
npx playwright install chromium
npx playwright test
```

> **Note:** The e2e suite is slower and currently has some failing tests on
> `main`. Treat it as supplementary — the unit tests and lint are the
> reliable baseline. E2E runs write results to `frontend/test-results/`;
> do not commit that directory.

### Suggested checklist before opening a PR

Run these commands while your terminal is already in `frontend/`:

```bash
npm run lint
npx jest
npm run build
```

Optional browser tests (also from `frontend/`):

```bash
npx playwright install chromium   # one-time browser installation
npx playwright test
```

The Playwright config starts the dev server on port 3000. The E2E suite may be
slower or flaky; treat it as supplementary and do not commit `test-results/`.

If you changed translation logic, also verify a real string by hand: upload a
`.po` file on `/translate`, translate a small batch, and confirm the exported
file still parses.

---

## MCP Servers and Claude Code Memory

The repository's root `.mcp.json` includes the existing `launchpad-bridge`
server and may include Chrome DevTools and Caveman. Chrome DevTools is launched
with `npx -y chrome-devtools-mcp@latest`; Caveman uses
`npx -y caveman-mcp`. The GitHub and Launchpad bridge entries currently use
machine-specific absolute paths, so contributors must adapt those paths locally
rather than assume they work on every computer.

Claude-Mem is installed separately with `npx claude-mem install` or through
Claude Code's plugin marketplace; follow its official installer rather than
adding an unverified manual command to `.mcp.json`. After changing MCP setup,
restart Claude Code and run `/mcp` to verify connectivity. Only install MCP
servers and plugins you trust.

## Git Workflow

1. **Fork** the repository on GitHub.

2. **Clone your fork** and add the upstream repository:

   ```bash
   git clone https://github.com/<your-username>/ubuntu-localization.git
   cd ubuntu-localization
   git remote add upstream https://github.com/Wint-Theingi-Aung/ubuntu-localization.git
   ```

3. **Create a focused branch** off `main`:

   ```bash
   git checkout -b fix/short-description
   ```

   Use a descriptive name such as `fix/placeholder-check`,
   `docs/glossary-guide`, or `feat/export-improvement`.

4. **Make your changes** and keep commits small and clear:

   ```bash
   git add <specific files>
   git commit -m "Fix placeholder check for positional specifiers"
   ```

   Prefer adding specific files over `git add .` so unrelated changes do not
   sneak in.

5. **Validate** with the checklist above.

6. **Push to your fork**:

   ```bash
   git push origin fix/short-description
   ```

7. **Open a pull request** against `main`.

### Writing a good pull request

- Give the PR a clear title and description.
- Explain **what** changed and **why**.
- Include **testing notes**: the commands you ran and their results
  (for example, "`npm run lint` clean, `npx jest` — 5 suites passed").
- Link the related issue, if there is one.
- For translation PRs, note which language and how many strings you changed,
  and confirm you reviewed any AI-assisted output by hand.

> If you use Claude Code in this repository, the `/pr-description` skill can
> help draft a structured PR description.

---

## Security

**Never commit secrets.** Specifically:

- **Never commit API keys**, tokens, or passwords — including your
  `GOOGLE_API_KEY`, database credentials, or Launchpad keys.
- **Never commit `.env` files** or copies of them. `.env`, `.env.local`, and
  `.env.*.local` are already gitignored — keep it that way.
- **Do not paste real credentials** into issues, pull requests, screenshots,
  or test files.

Use the placeholder style shown in `.env.example` when documenting configuration:

```bash
GOOGLE_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

(No `SESSION_SECRET` is required — see "Local Development Setup".)

If you accidentally commit a secret, **rotate it immediately** — removing it
from a later commit does not erase it from Git history — and mention it in the
issue or PR so it can be handled.

---

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE) that covers this project.
