# pr-description

Generates structured pull request descriptions for translation contributions. Analyzes export history, session data, and translation records to produce consistent, review-ready PR bodies for manual submission to GitHub.

## Usage
```
/pr-description
```

## Steps
1. Scan recent export history from `exports/` and database records
2. For each language: count newly translated strings, QA pass rate
3. Generate PR body with:
   - Language summary table (strings per language)
   - QA stats (pass rate, any flagged entries)
   - List of exported files
   - Notes on any entries needing human review
4. Output markdown ready for paste into GitHub PR description

## Output Format (Markdown)
```markdown
## Summary
- Languages: Myanmar (+42), Shan (+18), Mon (+5)
- QA pass rate: 97.3%
- Files exported: 3

## QA Results
| Language | Translated | QA Passed | QA Flagged | Pass Rate |
|----------|-----------|-----------|------------|-----------|
| Myanmar  | 42        | 41        | 1          | 97.6%     |
| Shan     | 18        | 18        | 0          | 100%      |
| Mon      | 5         | 5         | 0          | 100%      |

## Files
- `translated_my_myanmar_messages_20260619.po`
- `translated_shn_shan_system_20260619.po`
- `translated_mnw_mon_ui_20260619.po`

## Notes
- 1 Myanmar entry flagged for manual review — `%s` placeholder case mismatch
```

## Notes
- This skill generates markdown for manual paste into GitHub — it does NOT auto-create PRs
- All export data comes from the local database and export manifests
- QA stats are drawn from the translator's built-in verification checks
