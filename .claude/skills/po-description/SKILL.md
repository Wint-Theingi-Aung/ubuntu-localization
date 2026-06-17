# po-description

Generates human-readable summaries of .po file contents: language, string count, translation coverage percentage, and a breakdown by priority tier. Used for project status reports and onboarding new translators.

## Usage
```
/po-description path/to/file.po
```

## Steps
1. Parse the .po file
2. Extract metadata: language, total entries, translated count, fuzzy count, untranslated count
3. Calculate coverage percentage
4. Break down by priority tier (p1/p2/p3)
5. List top-10 longest untranslated strings (potential blockers)
6. Output a clean summary card

## Output Format
```
Language: Shan (shn)
Total: 342 entries
Translated: 287 (83.9%)
Fuzzy: 12 (3.5%)
Untranslated: 43 (12.6%)
P1 (critical): 8 remaining
P2 (important): 21 remaining
P3 (low): 14 remaining
```
