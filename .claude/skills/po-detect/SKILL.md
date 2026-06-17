# po-detect

Scans the loaded .po file for missing translations and fuzzy entries. Prioritizes by UI visibility (p1 = system menus/dialogs, p2 = help text/tooltips, p3 = debug/developer strings). Produces a ranked translation queue ready for batch dispatch via po-translate.

## Usage
```
/po-detect
```

## Priority Tiers
- **p1 (Critical)**: System menus, dialogs, button labels, error messages — seen by every user
- **p2 (Important)**: Help text, tooltips, notifications, status messages
- **p3 (Low)**: Debug strings, developer comments, deprecated entries

## Steps
1. Scan all entries in the translation queue
2. Identify untranslated (empty msgstr) and fuzzy entries
3. Assign priority tier based on msgctxt, source file, and string type heuristics
4. Group by language
5. Output ranked queue: p1 first, then p2, then p3
6. Report: N strings ready in queue, with priority breakdown per language
