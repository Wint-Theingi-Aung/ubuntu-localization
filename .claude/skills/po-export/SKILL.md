# po-export

Writes QA-verified translations back into .po format with proper headers, language tags, and timestamps. Auto-generates filenames like `translated_shan_messages_20260212.po`. Returns a downloadable file — no side effects.

## Web UI
Go to `/translate/` — the export section appears at the bottom of the page once you have translations:
1. Preview shows output filename, new string count, completion percentage
2. Click "Export .po File" to generate and download the .po file
3. Download link appears after export

## Usage (CLI)
```
/po-export
```

## Steps
1. Gather all QA-passed translations from the current session
2. Generate .po file with proper GNU gettext headers (Project-Id-Version, Language, Language-Team, PO-Revision-Date)
3. Preserve original msgctxt, translator comments, and source references
4. Name file: `translated_{language}_{source}_{YYYYMMDD}.po`
5. Write to `exports/` directory
6. Return downloadable file

## Options
- `--lang=<code>`: Export only a specific language (e.g. `--lang=shn`)
