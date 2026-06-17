# pr-description

Auto-generates structured pull request descriptions for translation contributions. Lists languages touched, string counts, QA pass rates, and a summary of changes. Ensures every PR into `ai-enhanced` (or `main`) has consistent, review-ready context.

## Usage
```
/pr-description
```

## Steps
1. Diff current branch against base branch (ai-enhanced or main)
2. Identify all changed .po files and export artifacts
3. For each language: count added translations, modified translations, QA pass rate
4. Generate PR body with:
   - Language summary table
   - QA stats (pass rate per language)
   - List of files changed
   - Notes on any rejected/fuzzy entries left for manual review
5. Output markdown ready for paste into GitHub PR description

## Output Format (Markdown)
```markdown
## Summary
- Languages: Burmese (+42), Shan (+18), Mon (+5)
- QA pass rate: 97.3%
- Files changed: 3

## QA Results
| Language | Translated | Passed | Failed | Rate |
|----------|-----------|--------|--------|------|
| Burmese  | 42        | 41     | 1      | 97.6%|
| Shan     | 18        | 18     | 0      | 100% |
| Mon      | 5         | 5      | 0      | 100% |

## Flagged for Review
- burmese_messages.po: entry #23 — %s placeholder case mismatch
```
