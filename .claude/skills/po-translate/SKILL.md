# po-translate

Orchestrates the full .po translation pipeline: loads untranslated strings from the queue, dispatches them in batches to the translate-batch agent (Gemini-powered), then runs triple-lens adversarial QA verification via the qa-reviewer agent. Merges majority-vote results (2+/3 lenses must pass per entry). Writes approved translations back and reports pass/fail stats.

## Usage
```
/po-translate --priority=p1
```

## Steps
1. Read the translation queue (populated by po-upload / po-detect)
2. Batch entries into groups of 15-20
3. Dispatch each batch to the `translate-batch` agent with `{target_lang, lang_code, entries}`
4. Send each translated batch to the `qa-reviewer` agent for 3-lens verification
5. Merge results: approved entries → write back, rejected → flag for review
6. Report summary with pass rate and next-action links

## Options
- `--priority=p1`: Only translate high-priority strings (system menus, dialogs)
- `--priority=p2`: Include help text and secondary UI
- `--priority=all`: Translate everything in the queue
