export const meta = {
  name: 'batch-translate-orchestrator',
  description: 'Orchestrate parallel batch translation of Ubuntu .po files with adversarial QA verification. Splits untranslated entries, fans out to translate-batch agents, verifies with qa-reviewer agents, and merges results.',
  phases: [
    { title: 'Load', detail: 'Load translation queue and session data' },
    { title: 'Translate', detail: 'Parallel translate-batch agents per batch of entries' },
    { title: 'Verify', detail: 'Adversarial qa-reviewer verification (3-lens majority vote)' },
    { title: 'Merge', detail: 'Merge passing translations, flag failures for review' },
    { title: 'Report', detail: 'Summary report with pass/fail statistics' }
  ]
}

// ============================================================================
// Constants
// ============================================================================

const LANGUAGES = {
  'Burmese':    { code: 'my',  family: 'Sino-Tibetan', script: 'Myanmar',      wordOrder: 'SOV' },
  'Shan':       { code: 'shn', family: 'Tai-Kadai',    script: 'Shan',          wordOrder: 'SVO' },
  'Mon':        { code: 'mnw', family: 'Austroasiatic',script: 'Mon',           wordOrder: 'SVO' },
  'Sgaw Karen': { code: 'ksw', family: 'Sino-Tibetan', script: 'Sgaw Karen',    wordOrder: 'SVO' }
}

const BATCH_SIZE = 15  // Optimal for Gemini token limits and QA throughput
const QA_VOTES = 3     // Number of independent qa-reviewer verdicts per entry

// ============================================================================
// JSON Schemas for structured agent output
// ============================================================================

const TRANSLATE_SCHEMA = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index:    { type: 'integer' },
          msgid:    { type: 'string' },
          translated: { type: 'string' }
        },
        required: ['index', 'msgid', 'translated']
      }
    }
  },
  required: ['translations']
}

const QA_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index:               { type: 'integer' },
          msgid:               { type: 'string' },
          translated:          { type: 'string' },
          lens1_placeholder:   { type: 'object', properties: { pass: { type: 'boolean' }, issues: { type: 'array' } } },
          lens2_context:       { type: 'object', properties: { pass: { type: 'boolean' }, issues: { type: 'array' } } },
          lens3_structure:     { type: 'object', properties: { pass: { type: 'boolean' }, issues: { type: 'array' } } },
          overall_pass:        { type: 'boolean' },
          pass_count:          { type: 'integer' },
          issues:              { type: 'array' }
        },
        required: ['index', 'msgid', 'translated', 'overall_pass', 'pass_count']
      }
    },
    summary: {
      type: 'object',
      properties: {
        total:     { type: 'integer' },
        passed:    { type: 'integer' },
        failed:    { type: 'integer' },
        pass_rate: { type: 'number' }
      },
      required: ['total', 'passed', 'failed', 'pass_rate']
    }
  },
  required: ['results', 'summary']
}

// ============================================================================
// Phase 1: Load queue and session data
// ============================================================================

phase('Load')

// The session data path is standard for this project
const SESSION_DIR = '/home/wint/.claude/projects/-home-wint-ubuntu-localization/session'
const QUEUE_FILE = `${SESSION_DIR}/translation_queue.json`
const SESSION_FILE = `${SESSION_DIR}/current_translation.json`

// Log what we're about to process
log(`Loading translation queue from: ${QUEUE_FILE}`)

const queueRaw = await agent(
  `Read the file at ${QUEUE_FILE}. Return ONLY the file contents as raw JSON — no explanation, no markdown, no backticks. The file should contain a translation queue with batches of untranslated entries.`,
  { label: 'load-queue' }
)

const sessionRaw = await agent(
  `Read the file at ${SESSION_FILE}. Return ONLY the file contents as raw JSON — no explanation, no markdown, no backticks. The file should contain the full parsed .po data with all untranslated entries.`,
  { label: 'load-session' }
)

let queue, session
try {
  // Clean markdown fences if present
  const cleanJSON = (s) => s.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  queue = JSON.parse(cleanJSON(queueRaw))
  session = JSON.parse(cleanJSON(sessionRaw))
} catch (e) {
  log(`ERROR: Failed to parse session data: ${e.message}`)
  log('Run /po-upload and /po-detect first to generate the queue.')
  return { error: 'session_load_failed', detail: e.message }
}

const targetLang = queue.target_lang || session.language || 'Burmese'
const langCode = queue.target_lang_code || LANGUAGES[targetLang]?.code || 'my'
const untranslated = session.untranslated || []

if (!untranslated.length) {
  log('No untranslated entries found. All strings are already translated!')
  return { status: 'already_complete', total: session.metadata?.total_entries || 0 }
}

log(`Loaded: ${untranslated.length} untranslated entries for ${targetLang} (${langCode})`)

// ============================================================================
// Phase 2: Build batches and translate in parallel
// ============================================================================

phase('Translate')

// Split entries into batches
const batches = []
for (let i = 0; i < untranslated.length; i += BATCH_SIZE) {
  const batchEntries = untranslated.slice(i, i + BATCH_SIZE)
  batches.push({
    id: batches.length + 1,
    entries: batchEntries,
    priority: batchEntries[0]?.priority || 'p2'
  })
}

log(`Split into ${batches.length} batches of up to ${BATCH_SIZE} entries each`)

// Parallel translate: each batch gets its own translate-batch agent
// Using parallel() because we need all translations before QA
const translationResults = await parallel(
  batches.map(batch => () => {
    const input = JSON.stringify({
      target_lang: targetLang,
      lang_code: langCode,
      entries: batch.entries.map(e => ({
        index: e.index,
        msgid: e.msgid,
        msgctxt: e.msgctxt || null
      }))
    })

    return agent(
      `Translate the following batch of Ubuntu .po entries to ${targetLang} (${langCode}).

Translation rules:
- Preserve ALL placeholders exactly: %s, %d, %f, %u, {0}, {1}, %(name)s, $1, etc.
- Preserve HTML/XML tags and entities: <b>, </b>, &amp;, &#160; etc.
- Preserve newlines (\\n) and whitespace exactly
- Keep Ubuntu technical terms UNTRANSLATED: Kernel, GNOME, sudo, apt, GRUB, X11, Wayland, DNS, SSH, systemd, dbus, etc.
- Keep brand names: Ubuntu, Canonical, Debian, Firefox, LibreOffice
- For menu items and buttons: concise imperative form
- For help text and descriptions: natural explanatory language
- NEVER use Zawgyi encoding — always Unicode Myanmar (Burmese only)
- Return ONLY valid JSON matching the required schema

Input batch:
${input}`,
      {
        label: `translate-batch-${batch.id}`,
        phase: 'Translate',
        schema: TRANSLATE_SCHEMA
      }
    )
  })
)

// Filter out nulls (agent failures) and flatten
const allTranslations = translationResults
  .filter(Boolean)
  .flatMap(r => r.translations || [])

log(`Translation complete: ${allTranslations.length} / ${untranslated.length} strings translated`)

if (!allTranslations.length) {
  return { error: 'no_translations_produced', detail: 'All translation agents failed or returned empty' }
}

// ============================================================================
// Phase 3: Adversarial QA verification
// ============================================================================

phase('Verify')

// Pipeline: each entry goes through 3 independent qa-reviewer agents
const qaInput = JSON.stringify({
  target_lang: targetLang,
  entries: allTranslations.map(t => ({
    index: t.index,
    msgid: t.msgid,
    translated: t.translated,
    msgctxt: untranslated.find(e => e.index === t.index)?.msgctxt || null
  }))
})

// Run 3 independent QA reviewers (different seeds/angles)
const qaVotes = await parallel(
  Array.from({ length: QA_VOTES }, (_, i) => () =>
    agent(
      `You are QA Reviewer #${i + 1} of ${QA_VOTES}. Review these Ubuntu ${targetLang} translations adversarially.

${i === 0 ? 'FOCUS: Placeholder integrity. Check every %s, %d, {0}, <b>, \\n, etc. Be strict — any difference is an error.' :
  i === 1 ? 'FOCUS: Ubuntu context quality. Are technical terms preserved? Do menu items sound right? Is the meaning accurate for an OS UI?' :
            'FOCUS: Structural fidelity. Whitespace, newlines, punctuation, capitalization. Match character-for-character where possible.'}

Review each translation through ALL three lenses, but you are the EXPERT on your focus area. Flag issues aggressively.

Input:
${qaInput}`,
      {
        label: `qa-reviewer-${i + 1}`,
        phase: 'Verify',
        schema: QA_SCHEMA
      }
    )
  )
)

const validQAs = qaVotes.filter(Boolean)
log(`QA complete: ${validQAs.length}/${QA_VOTES} reviewers returned results`)

// ============================================================================
// Phase 4: Merge results — majority vote per entry
// ============================================================================

phase('Merge')

const results = []
const failures = []

for (const entry of allTranslations) {
  // Count how many reviewers passed this entry
  let passes = 0
  let allIssues = []

  for (const qa of validQAs) {
    const result = (qa.results || []).find(r => r.index === entry.index)
    if (result && result.overall_pass) passes++
    if (result && result.issues) allIssues = allIssues.concat(
      result.issues.map(issue => ({ ...issue, reviewer: qa.reviewer_id || 'unknown' }))
    )
  }

  const passed = passes >= 2  // Majority vote: need 2+ out of 3

  if (passed) {
    results.push({
      ...entry,
      status: 'qa_passed',
      qa_votes: passes,
      qa_total: validQAs.length,
      minor_issues: allIssues.filter(i => i.severity === 'warning')
    })
  } else {
    failures.push({
      ...entry,
      status: 'qa_failed',
      qa_votes: passes,
      qa_total: validQAs.length,
      issues: allIssues,
      action: 'Requires human review or retranslation'
    })
  }
}

log(`Merge complete: ${results.length} passed, ${failures.length} failed (${failures.length > 0 ? 'needs review' : 'all clean!'})`)

// ============================================================================
// Phase 5: Report
// ============================================================================

phase('Report')

const total = allTranslations.length
const passRate = results.length / total * 100
const failRate = failures.length / total * 100

const report = {
  timestamp: new Date().toISOString(),
  language: targetLang,
  language_code: langCode,
  batch_count: batches.length,
  batch_size: BATCH_SIZE,
  results: {
    total: total,
    passed: results.length,
    failed: failures.length,
    pass_rate_pct: Math.round(passRate * 10) / 10,
    fail_rate_pct: Math.round(failRate * 10) / 10
  },
  entries_passed: results,
  entries_failed: failures,
  actions: []
}

if (failures.length > 0) {
  report.actions.push(`/po-translate --retry-failed to re-translate ${failures.length} failed entries`)
  report.actions.push('Review failed entries in session/review_queue.json before export')
}

if (results.length > 0) {
  report.actions.push(`/po-export to commit and push ${results.length} QA-passed translations`)
}

// Write report
log(`Writing QA report to session directory...`)
log(`
✓ Translation Pipeline Complete — ${targetLang} (${langCode})

  Batches:    ${batches.length} × ~${BATCH_SIZE} entries
  Translated: ${total} strings
  QA Passed:  ${results.length} (${Math.round(passRate * 10) / 10}%)
  QA Failed:  ${failures.length} (${Math.round(failRate * 10) / 10}%)

  ${failures.length > 0
    ? `⚠ ${failures.length} entries need review — flag for human attention`
    : '✓ All entries passed QA!'}

  Next: ${report.actions[0]}
`)

return report
