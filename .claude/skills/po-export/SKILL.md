# po-export

Writes QA-verified translations back into .po format with proper headers, language tags, and timestamps. Auto-generates filenames like `translated_shan_messages_20260212.po`. Optionally auto-commits and pushes to GitHub via the GitHub MCP server.

## Usage
```
/po-export
```

## Steps
1. Gather all QA-passed translations from the current session
2. Generate .po file with proper GNU gettext headers (Project-Id-Version, Language, Language-Team, PO-Revision-Date)
3. Preserve original msgctxt, translator comments, and source references
4. Name file: `translated_{language}_{source}_{YYYYMMDD}.po`
5. Write to `data/exports/` directory
6. If GitHub MCP is configured: auto-commit with message `feat: export {language} translations ({N} strings)` and push

## Options
- `--no-commit`: Skip git commit/push step
- `--lang=<code>`: Export only a specific language (e.g. `--lang=shn`)
