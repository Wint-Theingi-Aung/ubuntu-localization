 'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  Upload, Languages, Download, FileText, Loader2, CheckCircle,
  AlertCircle, X, Play, Sparkles, Shield, Edit3, Eye, Check,
  ChevronDown, ChevronUp, RotateCcw, Info,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { LANGUAGES, TRANSLATION_CONFIG } from '@/lib/constants'
import { recordHistory } from '@/lib/history'
import {
  validateBatchResponse, canReviewBatch, isReviewEligible,
  describeTranslationIssues, collectTranslationIssues,
} from '@/lib/translate'
import {
  BATCH_SIZE, type TranslationEntry, buildFreshSession, createInitialSessionState,
  applyDraftTranslations, countByStatus, countUntranslated, confirmableCount,
  findBatchToAdvance, stripFilenameTimestamps,
} from '@/lib/session'
import { useAuth } from '@/lib/auth-context'

export default function TranslatePage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [step, setStep] = useState<'upload' | 'work' | 'complete'>('upload')
  const [currentBatch, setCurrentBatch] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [targetLang, setTargetLang] = useState('my')
  const [entries, setEntries] = useState<TranslationEntry[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null)
  const [poHeaders, setPoHeaders] = useState<Record<string, string>>({})
  const [reviewMode, setReviewMode] = useState(false)
  const [formatErrors, setFormatErrors] = useState<Record<number, string>>({})
  const [initialUploadTimestamp, setInitialUploadTimestamp] = useState<string>('')
  const [originalBaseFilename, setOriginalBaseFilename] = useState<string>('')
  const [initialConfirmedCount, setInitialConfirmedCount] = useState<number>(0)

  // Monotonic id for the active upload session. Any state transition bumps it,
  // which cancels in-flight AI drafts from a previous upload so stale responses
  // can never land in a newer session.
  const sessionRunRef = useRef(0)
  /**
   * Run id that owns the "translation in flight" lock, or null when idle.
   * Holding the run id means a request from an abandoned session can neither
   * keep the new session's button disabled nor clear its spinner.
   */
  const translateInFlightRef = useRef<number | null>(null)

  const languages = LANGUAGES

  // Record history to both localStorage and DB (when authenticated)
  const recordAndSyncHistory = useCallback((entry: Parameters<typeof recordHistory>[0]) => {
    recordHistory(entry)
    if (user) {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }).catch(() => {})
    }
  }, [user])

  const storageKey = useMemo(() => {
    if (!file || !initialUploadTimestamp) return null
    return `ubuntu-translate-${initialUploadTimestamp}-${file.name}-${targetLang}`
  }, [file, initialUploadTimestamp, targetLang])

  useEffect(() => {
    if (!storageKey || entries.length === 0) return
    const timeout = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(entries))
    }, 500)
    return () => clearTimeout(timeout)
  }, [entries, storageKey])

  const totalBatches = Math.ceil(entries.length / BATCH_SIZE)
  const currentBatchEntries = useMemo(
    () => entries.slice(currentBatch * BATCH_SIZE, (currentBatch + 1) * BATCH_SIZE),
    [entries, currentBatch]
  )
  const batchAllConfirmed = currentBatchEntries.length > 0 &&
    currentBatchEntries.every(e => e.status === 'confirmed')
  const batchHasPending = currentBatchEntries.some(e => e.status === 'pending')
  // Partial batches are reviewable: at least one non-empty translation is enough.
  const canReview = canReviewBatch(currentBatchEntries)
  // Review lists only translated strings; empty/skipped entries stay in the
  // translate phase and are never treated as completed translations.
  const batchReviewEntries = useMemo(
    () => currentBatchEntries.filter(isReviewEligible),
    [currentBatchEntries]
  )
  const workPhase: 'translate' | 'review' = reviewMode ? 'review' : 'translate'

  const statusCounts = useMemo(() => countByStatus(entries), [entries])
  const confirmedCount = statusCounts.confirmed
  const totalCount = statusCounts.total
  // The only progress figure shown: strings that still have no translation.
  const untranslatedCount = useMemo(() => countUntranslated(entries), [entries])

  // Entries the Confirm action would really confirm — the count behind the
  // button label, and the guard that keeps a zero count off the screen.
  const batchConfirmableCount = useMemo(
    () => confirmableCount(currentBatchEntries, formatErrors),
    [currentBatchEntries, formatErrors]
  )
  // True when clicking Confirm All would confirm every entry in the batch,
  // which is what triggers the auto-advance to the next batch.
  const batchWillBeFullyConfirmed = currentBatchEntries.length > 0 &&
    currentBatchEntries.every(e =>
      e.status === 'confirmed' || (e.status === 'reviewing' && !formatErrors[e.index])
    )

  const activeStepKey = step === 'upload' ? 'upload'
    : step === 'complete' ? 'complete'
    : workPhase === 'translate' ? 'translate'
    : 'review'

  useEffect(() => {
    if (step !== 'work') return
    if (currentBatchEntries.length === 0) return
    if (!batchAllConfirmed) return
    const timer = setTimeout(() => {
      const nextBatch = findBatchToAdvance(entries, currentBatch, BATCH_SIZE)
      if (nextBatch < totalBatches) {
        setCurrentBatch(nextBatch)
        setReviewMode(false)
        setExpandedEntry(null)
      } else {
        setStep('complete')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [step, batchAllConfirmed, currentBatch, totalBatches, currentBatchEntries.length, entries])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const allowed = TRANSLATION_CONFIG.ALLOWED_EXTENSIONS
    if (!allowed.some(ext => f.name.endsWith(ext))) {
      setError(t('translation_invalid_file', `Only ${allowed.join(', ')} files are supported`)); return
    }
    if (f.size > TRANSLATION_CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(t('translation_file_too_large', `File too large. Maximum size is ${TRANSLATION_CONFIG.MAX_FILE_SIZE_MB} MB.`)); return
    }
    setFile(f); setError(null)
  }, [t])

  /** Indexes currently being sent to the AI, so a request is never duplicated. */
  const inFlightRef = useRef<Set<number>>(new Set())

  /**
   * Drop every upload-specific piece of state. Bumping the run id cancels any
   * AI draft still in flight, so a response from a previous PO file can never
   * land in the new session.
   */
  const clearSessionData = useCallback(() => {
    sessionRunRef.current += 1
    inFlightRef.current = new Set()
    translateInFlightRef.current = null
    const initial = createInitialSessionState()
    setEntries(initial.entries)
    setCurrentBatch(initial.currentBatch)
    setReviewMode(initial.reviewMode)
    setExpandedEntry(initial.expandedEntry)
    setFormatErrors(initial.formatErrors)
    setInitialConfirmedCount(initial.initialConfirmedCount)
    setInitialUploadTimestamp(initial.initialUploadTimestamp)
    setOriginalBaseFilename(initial.originalBaseFilename)
    setPoHeaders({})
    setIsTranslating(false)
  }, [])

  /** Leave the work area and return to a clean upload step. */
  const handleStartNew = useCallback(() => {
    clearSessionData()
    if (storageKey) localStorage.removeItem(storageKey)
    setError(null)
    setFile(null)
    setStep('upload')
  }, [clearSessionData, storageKey])

  /**
   * Ask the AI for drafts for `indexes` and apply whatever comes back.
   *
   * Results are applied first, message second: every string the API answered
   * for lands in its own field before anything else happens, and whatever it
   * could not answer for stays pending for a retry. Returns a message to show
   * the user, or null when the whole request succeeded.
   */
  const requestDrafts = useCallback(async (
    snapshot: TranslationEntry[],
    indexes: number[],
    runId: number,
  ): Promise<string | null> => {
    const wanted = new Set(indexes)
    const batch = snapshot.filter(e =>
      wanted.has(e.index) &&
      e.status === 'pending' &&
      e.msgid.trim().length > 0 &&
      !inFlightRef.current.has(e.index),
    )
    if (batch.length === 0) return null

    const requested = batch.map(e => e.index)
    for (const i of requested) { inFlightRef.current.add(i) }

    // Never leave the UI spinning: a hung request aborts with a message.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90_000)

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          entries: batch.map(e => ({ index: e.index, msgid: e.msgid })),
          target_lang: targetLang,
        }),
      })

      if (!response.ok) {
        let message = 'Translation failed'
        try {
          const data = await response.json()
          if (data?.error) message = data.error
        } catch {
          message = `Translation failed with status ${response.status}`
        }
        return message
      }

      const data = await response.json()
      // Partial responses are accepted: each result carries its own index, so
      // a string the model skipped simply stays pending instead of wiping out
      // the translations that did arrive.
      const validation = validateBatchResponse(data.translations, requested, { allowPartial: true })
      if (!validation.ok) return validation.error || 'Invalid translation response'

      // A superseded session must not receive this response.
      if (sessionRunRef.current !== runId) return null

      const translationMap = validation.translationMap!
      const issues = collectTranslationIssues(batch, translationMap)
      const failed = validation.failedIndexes || []

      // Apply the validated batch atomically. Drafts only ever land on
      // `pending` entries, so human edits and confirmations survive, and the
      // UI renders them in the same update.
      setEntries(prev => applyDraftTranslations(prev, translationMap))
      setFormatErrors(prev => {
        const next = { ...prev }
        // Fresh results replace any issue recorded for those strings earlier.
        for (const i of requested) delete next[i]
        return { ...next, ...issues }
      })

      if (failed.length > 0) {
        return t('translation_partial_failed', '{failed} of {total} strings were not translated. They remain pending — click Translate to retry.')
          .replace('{failed}', String(failed.length))
          .replace('{total}', String(requested.length))
      }
      return null
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return t('translation_timeout', 'The translation request timed out. Please try again.')
      }
      return err?.message || 'Translation failed'
    } finally {
      clearTimeout(timeout)
      for (const i of requested) inFlightRef.current.delete(i)
    }
  }, [targetLang, t])

  const handleUpload = useCallback(async () => {
    if (!file) return
    // A new upload is always a new session: drop the previous one before the
    // request so no batch number, translation, review state or confirmed count
    // can leak into the file that follows.
    clearSessionData()
    setIsTranslating(true)
    setError(null)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('target_lang', targetLang)

    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Upload failed') }
      const d = await r.json()

      const session = buildFreshSession(d.all_entries, d.filename || 'messages.po')
      setEntries(session.entries)
      setPoHeaders(d.po_headers || {})
      setInitialConfirmedCount(session.initialConfirmedCount)
      setOriginalBaseFilename(session.originalBaseFilename)
      setInitialUploadTimestamp(session.initialUploadTimestamp)
      setCurrentBatch(session.currentBatch)
      setReviewMode(session.reviewMode)
      setExpandedEntry(session.expandedEntry)
      setFormatErrors(session.formatErrors)
      setStep('work')
      setIsTranslating(false)
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
      setIsTranslating(false)
    }
  }, [file, targetLang, clearSessionData])

  /**
   * Translate every still-untranslated string of the current batch (at most
   * BATCH_SIZE). The batch only counts as translated once `requestDrafts` has
   * applied the response, so the spinner, the fields and the Review button all
   * move together on the update that carries the results.
   */
  const handleTranslate = useCallback(async () => {
    const runId = sessionRunRef.current
    // A second click while one request is open is a no-op, not a second
    // request: without this the first response could clear the second
    // request's spinner and re-enable Review while results were still
    // in flight.
    if (translateInFlightRef.current !== null) return
    setError(null)

    const pending = currentBatchEntries.filter(
      e => e.status === 'pending' && e.msgid.trim().length > 0,
    )
    if (pending.length === 0) return

    translateInFlightRef.current = runId
    setIsTranslating(true)
    try {
      const failure = await requestDrafts(
        entries,
        pending.map(e => e.index),
        runId,
      )
      if (failure && sessionRunRef.current === runId) setError(failure)
    } catch (err: any) {
      if (sessionRunRef.current === runId) {
        setError(err?.message || 'Translation failed')
      }
    } finally {
      if (translateInFlightRef.current === runId) translateInFlightRef.current = null
      // Always release the button — a stuck spinner is what makes the page
      // look like it silently dropped the results.
      if (sessionRunRef.current === runId) setIsTranslating(false)
    }
  }, [currentBatchEntries, entries, requestDrafts])

  const handleStartReview = useCallback(() => {
    // Review opens only on results that are already in the fields: never
    // while a request is still running, never from an empty batch.
    if (isTranslating || !canReviewBatch(currentBatchEntries)) return
    setEntries(prev => prev.map(e => {
      if (currentBatchEntries.some(be => be.index === e.index) && e.msgstr.trim().length > 0 && e.status !== 'confirmed') {
        return { ...e, status: 'reviewing' as const }
      }
      return e
    }))
    setReviewMode(true)
  }, [currentBatchEntries, isTranslating])

  const handleEditTranslation = useCallback((index: number, newMsgstr: string) => {
    const entry = entries.find(e => e.index === index)
    const issue = entry ? describeTranslationIssues(entry.msgid, newMsgstr) : null

    setEntries(prev => prev.map(e =>
      e.index === index ? { ...e, msgstr: newMsgstr } : e
    ))
    setFormatErrors(prev => {
      const next = { ...prev }
      if (issue) next[index] = issue
      else delete next[index]
      return next
    })
  }, [entries])

  const handleConfirmEntry = useCallback((index: number) => {
    if (formatErrors[index]) return
    setEntries(prev => prev.map(e =>
      e.index === index ? { ...e, status: 'confirmed' as const } : e
    ))
  }, [formatErrors])

  const handleUnconfirmEntry = useCallback((index: number) => {
    setEntries(prev => prev.map(e =>
      e.index === index ? { ...e, status: 'reviewing' as const } : e
    ))
  }, [])

  const handleConfirmAllBatch = useCallback(() => {
    const start = currentBatch * BATCH_SIZE
    const end = start + BATCH_SIZE
    setEntries(prev => prev.map(e =>
      e.index >= start && e.index < end && e.status === 'reviewing' && !formatErrors[e.index]
        ? { ...e, status: 'confirmed' as const }
        : e
    ))
  }, [currentBatch, formatErrors])

  const handleResetToAI = useCallback((index: number) => {
    setEntries(prev => prev.map(e =>
      e.index === index ? { ...e, msgstr: '', status: 'pending' as const } : e
    ))
    setFormatErrors(prev => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }, [])

  const handleExport = useCallback(async () => {
    if (entries.length === 0) {
      setError(t('translation_no_confirmed', 'No confirmed translations to export. Confirm at least one entry first.'))
      return
    }
    try {
      const r = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: entries.map(e => ({
            index: e.index,
            msgid: e.msgid,
            msgstr: e.msgstr || '',
            msgctxt: e.msgctxt || '',
            flags: e.flags || [],
            occurrences: e.occurrences || [],
            tcomment: e.tcomment || '',
          })),
          language_code: targetLang,
          filename: `${originalBaseFilename || (file?.name || 'messages.po').replace(/\.po$/, '')}.po`,
          po_headers: poHeaders,
        }),
      })
      if (!r.ok) {
        throw new Error('Export failed')
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const now = new Date()
      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const baseName = stripFilenameTimestamps(originalBaseFilename || (file?.name || 'messages.po').replace(/\.po$/, ''))
      a.download = `${baseName}-${ts}.po`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      const cc = entries.filter(e => e.status === 'confirmed').length
      const pct = entries.length > 0 ? Math.round((cc / entries.length) * 100) : 0
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      recordAndSyncHistory({
        action: 'export',
        description: `Exported translated ${file?.name || 'messages.po'}`,
        descriptionKey: 'activity_exported_file',
        descriptionParams: { file: file?.name || 'messages.po' },
        language: langName,
        details: `${cc} confirmed translations`,
        detailsKey: 'activity_new_translations',
        detailsParams: { count: cc, percent: pct },
      })
    } catch (err: any) { setError(err.message) }
  }, [entries, targetLang, file, poHeaders, formatErrors, t, recordAndSyncHistory, originalBaseFilename])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('translation_title', 'Translation')}</h1>
          <Sparkles className="text-ubuntu-orange animate-pulse-slow" size={24} />
        </div>
        <p className="text-[var(--tx-muted)] mt-1">{t('translation_subtitle', 'AI-powered translation using Google Gemini 2.5 Flash')}</p>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        {([
          { key: 'upload', label: t('translation_step_upload', 'Upload'), icon: Upload },
          { key: 'translate', label: t('translation_step_translate', 'Translate'), icon: Languages },
          { key: 'review', label: t('translation_step_review', 'Review'), icon: Eye },
          { key: 'complete', label: t('translation_step_complete', 'Complete'), icon: CheckCircle },
        ] as const).map((s, idx) => {
          const stepKeys = ['upload', 'translate', 'review', 'complete'] as const
          const activeIdx = stepKeys.indexOf(activeStepKey)
          const isCompleted = idx < activeIdx
          const isActive = s.key === activeStepKey
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`step-dot ${isActive ? 'active' : isCompleted ? 'completed' : 'pending'}`}>
                {isCompleted ? <CheckCircle size={16} /> : <s.icon size={16} />}
              </div>
              <span className={`text-xs sm:text-sm ${isActive ? 'text-[var(--tx-primary)] font-medium' : 'text-[var(--tx-dim)]'}`}>
                {s.label}
              </span>
              {idx < 3 && <div className={`step-line ${isCompleted ? 'completed' : ''} hidden sm:block`} />}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="glass-card p-4 border-l-4 border-red-500/50">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-400" size={20} />
            <p className="text-[var(--tx-primary)] text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)}>
              <X size={18} className="text-[var(--tx-muted)] hover:text-[var(--tx-primary)]" />
            </button>
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="glass-card p-8">
          <div className="mb-6 p-4 rounded-lg border-l-4 border-l-ubuntu-orange bg-ubuntu-orange/5">
            <div className="flex gap-3">
              <Info className="text-ubuntu-orange flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-[var(--tx-primary)] font-medium">
                  {t('translation_contribution_title', 'Ubuntu Localization Contributions Only')}
                </p>
                <p className="text-xs text-[var(--tx-muted)] mt-1">
                  {t('translation_contribution_note', 'This tool is for Ubuntu Localization Contributions only. We support .po files for direct translation. Please ensure your files are exported from Launchpad.')}
                </p>
              </div>
            </div>
          </div>
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <label className="block text-sm text-[var(--tx-muted)] mb-2">{t('translation_target_language', 'Target Language')}</label>
              <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="input-field w-full">
                {languages.map(l => (
                  <option key={l.code} value={l.code}>{l.name} ({l.native})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--tx-muted)] mb-2">{t('translation_po_file', '.po File')}</label>
              <label className={`upload-zone ${file ? 'has-file' : ''}`}>
                <input type="file" accept=".po" onChange={handleFileSelect} className="hidden" />
                {file ? (
                  <div className="text-center">
                    <FileText className="mx-auto text-ubuntu-orange mb-2" size={32} />
                    <p className="text-[var(--tx-primary)] font-medium">{file.name}</p>
                    <p className="text-sm text-[var(--tx-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto text-[var(--tx-dim)] mb-2" size={32} />
                    <p className="text-[var(--tx-muted)]">{t('translation_drop_hint', 'Drop .po file here or click to browse')}</p>
                    <p className="text-xs text-[var(--tx-dim)] mt-1">{t('translation_max_size', 'Maximum 50 MB')}</p>
                  </div>
                )}
              </label>
            </div>
            <button onClick={handleUpload} disabled={!file || isTranslating} className="btn-primary w-full flex items-center justify-center gap-2">
              {isTranslating
                ? <><Loader2 size={18} className="animate-spin" />{t('translation_parsing', 'Parsing...')}</>
                : <><Upload size={18} />{t('translation_upload_parse', 'Upload & Parse')}</>}
            </button>
            <div className="text-center">
              <p className="text-sm text-[var(--tx-dim)] mb-2">{t('translation_no_file', 'No .po file handy?')}</p>
              <button onClick={() => {
                // Demo is its own session too: cancel in-flight work and drop
                // any format errors left over from a previous file.
                sessionRunRef.current += 1
                inFlightRef.current = new Set()
                translateInFlightRef.current = null
                setIsTranslating(false)
                setEntries([
                  { index: 0, msgid: 'Power Off', msgstr: '', flags: [], occurrences: [], status: 'pending' },
                  { index: 1, msgid: 'Suspend', msgstr: '', flags: [], occurrences: [], status: 'pending' },
                  { index: 2, msgid: 'Restart...', msgstr: '', flags: [], occurrences: [], status: 'pending' },
                  { index: 3, msgid: 'Power Off...', msgstr: '', flags: [], occurrences: [], status: 'pending' },
                  { index: 4, msgid: 'Log Out...', msgstr: '', flags: [], occurrences: [], status: 'pending' },
                ])
                setFormatErrors({})
                setCurrentBatch(0)
                setReviewMode(false)
                setExpandedEntry(null)
                setStep('work')
              }} className="btn-secondary flex items-center gap-2 mx-auto">
                <Play size={16} />{t('translation_try_demo', 'Try Demo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'work' && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className="text-[var(--tx-muted)]">
                  <span className="text-ubuntu-orange font-semibold">{untranslatedCount}</span>{' '}
                  {untranslatedCount === 1
                    ? t('translation_string', 'string')
                    : t('translation_strings', 'strings')}{' '}
                  {t('translation_remaining', 'remaining')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  disabled={confirmedCount === 0 || confirmedCount <= initialConfirmedCount}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Download size={16} />{t('translation_download_progress', 'Download Progress')}
                </button>
              </div>
            </div>
            <div className="progress-bar mt-3">
              <div
                className="progress-bar-fill bg-emerald-500"
                style={{ width: `${totalCount ? (confirmedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>

          {workPhase === 'translate' && (
            <>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating || !batchHasPending}
                  className="btn-primary flex items-center gap-2"
                >
                  {isTranslating
                    ? <><Loader2 size={18} className="animate-spin" />{t('translation_translating', 'Translating...')}</>
                    : <><Sparkles size={18} />{t('translation_translate', 'Translate')}</>}
                </button>
                {canReview && (
                  <button
                    onClick={handleStartReview}
                    disabled={isTranslating}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Eye size={18} />{t('translation_review_translations', 'Review Translations')}
                  </button>
                )}
              </div>
              <div className="glass-card">
                <div className="divide-y divide-[var(--border-light)]">
                  {currentBatchEntries.map(entry => (
                    <div key={entry.index} className="p-4 hover:bg-[var(--surface-overlay)] transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                        <div className="flex flex-col">
                          <p className="text-xs text-[var(--tx-dim)] mb-1 flex items-center gap-1">
                            <FileText size={10} />{t('translation_source', 'Source')}
                          </p>
                          <textarea
                            readOnly
                            value={entry.msgid}
                            className="input-field w-full font-mono text-sm min-h-[4rem] resize-y bg-[var(--surface-overlay)] border-[var(--border-light)] text-[var(--tx-primary)] cursor-default"
                            rows={3}
                          />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-xs text-[var(--tx-dim)] mb-1 flex items-center gap-1">
                            <Languages size={10} />
                            {entry.msgstr.trim().length > 0
                              ? entry.status === 'reviewing'
                                ? t('translation_preview', 'AI Translation \u2014 edit to refine')
                                : t('translation_translation', 'Translation')
                              : t('translation_pending', 'Pending translation')}
                          </p>
                          {entry.msgstr.trim().length > 0
                            ? (
                              <textarea
                                value={entry.msgstr}
                                onChange={(e) => handleEditTranslation(entry.index, e.target.value)}
                                className="input-field w-full font-myanmar text-sm min-h-[4rem] resize-y bg-emerald-500/5 border-emerald-500/20 focus:border-ubuntu-orange/50"
                                rows={2}
                                placeholder={t('translation_enter_translation', 'Enter or edit translation...')}
                              />
                            )
                            : <p className="text-[var(--tx-faint)] italic text-sm p-2.5 min-h-[4rem] flex items-center">{t('translation_pending_hint', 'Click Translate to generate')}</p>}
                        </div>
                      </div>
                      {entry.status === 'reviewing' && (
                        <div className="flex items-center gap-2 mt-2 ml-auto">
                          {formatErrors[entry.index] ? (
                            <span className="text-[10px] text-red-400 flex items-center gap-1">
                              <AlertCircle size={10} />{t('translation_format_mismatch', 'Format mismatch — review before confirming')}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <Sparkles size={10} />{t('translation_ai_generated', 'AI-generated \u2014 edit to refine')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {workPhase === 'review' && (
            <>
              <div className="glass-card p-4">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => setReviewMode(false)}
                    className="btn-ghost flex items-center gap-2 text-sm text-[var(--tx-muted)] hover:text-[var(--tx-primary)]"
                  >
                    <Edit3 size={16} />{t('translation_back_to_edit', 'Back to Edit')}
                  </button>
                  {batchConfirmableCount > 0 && (
                    <button
                      onClick={handleConfirmAllBatch}
                      className="btn-primary flex items-center gap-2 text-sm"
                    >
                      <Check size={16} />{batchWillBeFullyConfirmed
                        ? t('translation_confirm_all_next', 'Confirm All & Next Batch ({count})').replace('{count}', String(batchConfirmableCount))
                        : t('translation_confirm_all_fix', 'Confirm Valid ({count})').replace('{count}', String(batchConfirmableCount))}
                    </button>
                  )}
                </div>
              </div>

              {batchReviewEntries.length === 0 && (
                <div className="glass-card p-6 text-center">
                  <p className="text-sm text-[var(--tx-muted)]">
                    {t('translation_review_empty', 'No translated strings in this batch yet. Go back to Edit and translate at least one string.')}
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {batchReviewEntries.map(entry => {
                  const isExpanded = expandedEntry === entry.index
                  const isConfirmed = entry.status === 'confirmed'
                  const isReviewing = entry.status === 'reviewing'

                  return (
                    <div
                      key={entry.index}
                      className={`glass-card transition-all duration-200 ${
                        isConfirmed
                          ? 'border-l-4 border-l-emerald-500/50'
                          : isReviewing
                            // Yellow marks every string still waiting for a human check,
                            // so attention lands on the field itself, not on a counter.
                            ? 'border-l-4 border-l-amber-400/50 bg-amber-400/[0.06]'
                            : 'border-l-4 border-l-[var(--border-theme)]'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedEntry(isExpanded ? null : entry.index)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--surface-overlay)] transition-colors"
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isConfirmed
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isReviewing
                              ? 'bg-amber-400/20 text-amber-400'
                              : 'bg-[var(--surface-overlay)] text-[var(--tx-dim)]'
                        }`}>
                          {isConfirmed ? <Check size={14} /> : isReviewing ? <Edit3 size={14} /> : <FileText size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono text-[var(--tx-secondary)] truncate">{entry.msgid}</p>
                          <p className={`text-sm font-myanmar truncate mt-0.5 ${
                            isConfirmed ? 'text-emerald-400' : 'text-amber-300'
                          }`}>
                            {entry.msgstr || t('translation_empty', '(empty)')}
                          </p>
                        </div>
                        <span className={`badge flex-shrink-0 ${
                          isConfirmed ? 'badge-green' : isReviewing ? 'badge-yellow' : 'badge-orange'
                        }`}>
                          {isConfirmed ? t('translation_status_confirmed', 'Confirmed') : isReviewing ? t('translation_status_needs_review', 'Needs Review') : t('translation_status_pending', 'Pending')}
                        </span>
                        {isExpanded ? <ChevronUp size={16} className="text-[var(--tx-dim)]" /> : <ChevronDown size={16} className="text-[var(--tx-dim)]" />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-[var(--border-light)]">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="text-xs text-[var(--tx-dim)] mb-2 block flex items-center gap-1">
                                <FileText size={10} />{t('translation_source_text', 'Source Text')}
                              </label>
                              <textarea
                                readOnly
                                value={entry.msgid}
                                className="input-field w-full font-mono text-sm min-h-[5rem] resize-y bg-[var(--surface-overlay)] border-[var(--border-light)] text-[var(--tx-primary)] whitespace-pre-wrap cursor-default"
                                rows={3}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-[var(--tx-dim)] mb-2 block flex items-center gap-1">
                                <Edit3 size={10} />
                                {t('translation_review_label', 'Translation')} {isReviewing && <span className="text-amber-400">({t('translation_ai_review_hint', 'AI-generated \u2014 review & edit')})</span>}
                              </label>
                              <textarea
                                value={entry.msgstr}
                                onChange={(e) => handleEditTranslation(entry.index, e.target.value)}
                                className={`input-field w-full font-myanmar text-sm min-h-[5rem] resize-y ${
                                  isReviewing
                                    ? 'bg-amber-400/10 border-amber-400/40 focus:border-amber-400/70'
                                    : ''
                                }`}
                                rows={3}
                                placeholder={t('translation_enter_translation', 'Enter translation...')}
                              />
                            </div>
                          </div>

                          {formatErrors[entry.index] && (
                            <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                              <p className="text-xs text-red-400 flex items-center gap-1.5">
                                <AlertCircle size={14} />
                                {t('translation_format_error_entry', 'Format specifier mismatch: {error}').replace('{error}', formatErrors[entry.index])}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mt-4">
                            {isConfirmed ? (
                              <button
                                onClick={() => handleUnconfirmEntry(entry.index)}
                                className="btn-ghost flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300"
                              >
                                <RotateCcw size={14} />{t('translation_unconfirm', 'Unconfirm')}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleConfirmEntry(entry.index)}
                                disabled={!entry.msgstr || !!formatErrors[entry.index]}
                                className={`flex items-center gap-1.5 text-sm ${
                                  formatErrors[entry.index]
                                    ? 'btn-ghost text-red-400 cursor-not-allowed opacity-50'
                                    : 'btn-primary'
                                }`}
                              >
                                {formatErrors[entry.index]
                                  ? <><AlertCircle size={14} />{t('translation_fix_format', 'Fix Format Specifiers')}</>
                                  : <><Check size={14} />{t('translation_confirm_translation', 'Confirm Translation')}</>}
                              </button>
                            )}
                            <button
                              onClick={() => handleResetToAI(entry.index)}
                              className="btn-ghost flex items-center gap-1.5 text-sm text-[var(--tx-muted)] hover:text-[var(--tx-primary)]"
                            >
                              <RotateCcw size={14} />{t('translation_reset', 'Reset')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {step === 'complete' && (
        <div className="glass-card p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-emerald-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[var(--tx-primary)] mb-2">
            {t('translation_complete', 'Translation Complete!')}
          </h2>
          <p className="text-[var(--tx-muted)] mb-1">
            {t('translation_strings_ready', '{count} strings confirmed and ready to export').replace('{count}', String(confirmedCount))}
          </p>
          <p className="text-[var(--tx-dim)] text-sm mb-6">
            {t('translation_translated_to_lang', 'Translated to {lang} ({native})')
              .replace('{lang}', languages.find(l => l.code === targetLang)?.name || '')
              .replace('{native}', languages.find(l => l.code === targetLang)?.native || '')}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={handleExport} disabled={entries.length === 0} className="btn-primary flex items-center justify-center gap-2">
              <Download size={18} />{t('translation_download_po', 'Download .po File')}
            </button>
            <button onClick={handleStartNew} className="btn-secondary">
              {t('translation_start_new', 'Start New')}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--border-light)]">
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--tx-dim)]">
              <Shield size={12} />
              <span>{t('translation_qa_verified', 'QA verified with placeholder integrity checks')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
