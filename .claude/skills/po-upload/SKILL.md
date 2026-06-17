# po-upload

Parses uploaded .po files, extracts msgid/msgstr pairs, msgctxt context metadata, and translator comments. Detects untranslated entries and fuzzy translations. Loads them into the translation queue for batch processing by po-translate.

## Web UI
Go to `/translate/` — the unified pipeline page handles upload, translation, and export all in one place:
1. Drag-and-drop your .po file on the upload section
2. Language is auto-detected from file metadata
3. Priority report is generated automatically
4. Translation workspace opens immediately after upload

## Usage (CLI)
```
/po-upload path/to/file.po
```

## Steps
1. Parse the .po file using po_parser service rules
2. Extract all entries: msgid, msgstr, msgctxt, fuzzy flags, translator comments
3. Classify each entry: translated, untranslated, fuzzy, obsolete
4. Detect language from file metadata or filename pattern
5. Store in translation queue with priority metadata
6. Report: total entries, translated count, untranslated count, coverage %

## Supported File Patterns
- `*.po` — standard GNU gettext portable object files
- Auto-detects language from path or `Language:` header
