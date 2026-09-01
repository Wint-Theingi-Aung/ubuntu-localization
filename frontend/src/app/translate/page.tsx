'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Upload, Languages, Download, FileText, Loader2, CheckCircle,
  AlertCircle, X, Play, Sparkles, Shield, Edit3, Eye, Check,
  ChevronDown, ChevronUp, RotateCcw, Info,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { LANGUAGES, TRANSLATION_CONFIG } from '@/lib/constants'
import { recordHistory } from '@/lib/history'
import { compareFormatSpecifiers } from '@/lib/translate'

const BATCH_SIZE = 10

interface TranslationEntry {
  index: number
  msgid: string
  msgstr: string
  msgctxt?: string
  flags: string[]
  occurrences: string[]
  tcomment?: string
  status: 'pending' | 'translated' | 'reviewing' | 'confirmed'
}

export default function TranslatePage() {
  const { t } = useI18n()
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

  const languages = LANGUAGES

  useEffect(() => {
    if (!file || entries.length === 0) return
    const key = `ubuntu-translate-${file.name}-${targetLang}`
    const timeout = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(entries))
    }, 500)
    return () => clearTimeout(timeout)
  }, [entries, file, targetLang])

  const totalBatches = Math.ceil(entries.length / BATCH_SIZE)
  const currentBatchEntries = useMemo(
    () => entries.slice(currentBatch * BATCH_SIZE, (currentBatch + 1) * BATCH_SIZE),
    [entries, currentBatch]
  )
  const batchAllConfirmed = currentBatchEntries.length > 0 &&
    currentBatchEntries.every(e => e.status === 'confirmed')
  const batchHasPending = currentBatchEntries.some(e => e.status === 'pending')
  const canReview = currentBatchEntries.some(e => e.msgstr.trim().length > 0)
  const workPhase: 'translate' | 'review' = reviewMode ? 'review' : 'translate'

  const translatedCount = entries.filter(e =>
    e.status === 'translated' || e.status === 'reviewing' || e.status === 'confirmed'
  ).length
  const confirmedCount = entries.filter(e => e.status === 'confirmed').length
  const hasConfirmedEntry = confirmedCount > 0
  const untranslatedCount = entries.filter(e => e.status === 'pending').length
  const totalCount = entries.length

  const batchReviewingCount = currentBatchEntries.filter(e => e.status === 'reviewing' || e.status === 'translated').length
  const batchConfirmedCount = currentBatchEntries.filter(e => e.status === 'confirmed').length
  const batchFormatErrorCount = currentBatchEntries.filter(e => formatErrors[e.index]).length
  const totalFormatErrorCount = Object.keys(formatErrors).length

  const activeStepKey = step === 'upload' ? 'upload'
    : step === 'complete' ? 'complete'
    : workPhase === 'translate' ? 'translate'
    : 'review'

  useEffect(() => {
    if (step !== 'work') return
    if (currentBatchEntries.length === 0) return
    if (!batchAllConfirmed) return
    const timer = setTimeout(() => {
      let nextBatch = currentBatch + 1
      while (nextBatch < totalBatches) {
        const bStart = nextBatch * BATCH_SIZE
        const bEnd = Math.min(bStart + BATCH_SIZE, entries.length)
        const batch = entries.slice(bStart, bEnd)
        if (batch.some(e => e.status !== 'confirmed')) break
        nextBatch++
      }
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

  const handleUpload = useCallback(async () => {
    if (!file) return
    setIsTranslating(true); setError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('target_lang', targetLang)
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Upload failed') }
      const d = await r.json()
      const saveKey = `ubuntu-translate-${file!.name}-${targetLang}`
      localStorage.removeItem(saveKey)
      const merged: TranslationEntry[] = d.entries.map((e: any) => ({ ...e, msgstr: '', status: 'pending' as const }))
      setEntries(merged)
      setPoHeaders(d.po_headers || {})
      setCurrentBatch(0)
      setReviewMode(false)
      setExpandedEntry(null)
      setStep('work')
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      const pendingCount = merged.filter(e => e.status === 'pending').length
      recordHistory({
        action: 'upload',
        description: `Uploaded ${file!.name} for translation`,
        descriptionKey: 'activity_uploaded_file',
        descriptionParams: { file: file!.name },
        language: langName,
        details: `${merged.length} entries, ${pendingCount} untranslated`,
        detailsKey: 'activity_entries_n',
        detailsParams: { count: merged.length, untranslated: pendingCount },
        user: 'local-user',
      })
    } catch (err: any) { setError(err.message) }
    finally { setIsTranslating(false) }
  }, [file, targetLang])

  const handleTranslate = useCallback(async () => {
    setIsTranslating(true); setError(null)
    const batch = currentBatchEntries.filter(e => e.status === 'pending')
    if (batch.length === 0) { setIsTranslating(false); return }
    try {
      const r = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: batch.map(e => ({ index: e.index, msgid: e.msgid })),
          target_lang: targetLang,
        }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Translation failed') }
      const d = await r.json()
      const newErrors: Record<number, string> = {}
      setEntries(prev => {
        const updated = prev.map(e => {
          const m = d.translations.find((t: any) => t.index === e.index)
          if (m) {
            if (m.translated.trim().length > 0) {
              const { missing, extra } = compareFormatSpecifiers(e.msgid, m.translated)
              if (missing.length > 0 || extra.length > 0) {
                const parts: string[] = []
                if (missing.length) parts.push(`Missing: ${missing.join(', ')}`)
                if (extra.length) parts.push(`Extra: ${extra.join(', ')}`)
                newErrors[e.index] = parts.join('; ')
              }
            }
            return { ...e, msgstr: m.translated, status: 'reviewing' as const }
          }
          return e
        })
        return updated
      })
      setFormatErrors(prev => ({ ...prev, ...newErrors }))
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      recordHistory({
        action: 'translate',
        description: `Translated ${batch.length} strings with AI`,
        descriptionKey: 'activity_translated_n',
        descriptionParams: { count: batch.length, file: file?.name || 'demo' },
        language: langName,
        details: `AI batch translation with Gemini — ${file?.name || 'demo'}`,
        detailsKey: 'activity_ai_batch',
        user: 'local-user',
      })
    } catch (err: any) { setError(err.message) }
    finally { setIsTranslating(false) }
  }, [currentBatchEntries, targetLang, file])

  const handleStartReview = useCallback(() => {
    setEntries(prev => prev.map(e => {
      if (currentBatchEntries.some(be => be.index === e.index) && e.msgstr.trim().length > 0 && e.status !== 'confirmed') {
        return { ...e, status: 'reviewing' as const }
      }
      return e
    }))
    setReviewMode(true)
  }, [currentBatchEntries])

  const handleEditTranslation = useCallback((index: number, newMsgstr: string) => {
    setEntries(prev => {
      const updated = prev.map(e =>
        e.index === index ? { ...e, msgstr: newMsgstr } : e
      )
      const entry = updated.find(e => e.index === index)
      if (entry && entry.msgid && newMsgstr.trim().length > 0) {
        const { missing, extra } = compareFormatSpecifiers(entry.msgid, newMsgstr)
        if (missing.length > 0 || extra.length > 0) {
          const parts: string[] = []
          if (missing.length) parts.push(`Missing: ${missing.join(', ')}`)
          if (extra.length) parts.push(`Extra: ${extra.join(', ')}`)
          setFormatErrors(prev => ({ ...prev, [index]: parts.join('; ') }))
        } else {
          setFormatErrors(prev => {
            const next = { ...prev }
            delete next[index]
            return next
          })
        }
      } else {
        setFormatErrors(prev => {
          const next = { ...prev }
          delete next[index]
          return next
        })
      }
      return updated
    })
  }, [])

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
    setEntries(prev => prev.map((e, i) =>
      i >= start && i < end && (e.status === 'reviewing' || e.status === 'translated') && !formatErrors[e.index]
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
    const confirmedWithErrors = entries.filter(e => e.status === 'confirmed' && formatErrors[e.index])
    if (confirmedWithErrors.length > 0) {
      const names = confirmedWithErrors.slice(0, 3).map(e => `"${e.msgid.slice(0, 40)}..."`)
      const more = confirmedWithErrors.length > 3 ? ` and ${confirmedWithErrors.length - 3} more` : ''
      setError(
        t('translation_export_blocked', 'Cannot export: {count} confirmed entry(ies) have format specifier mismatches ({names}{more}). Unconfirm and fix them first.')
          .replace('{count}', String(confirmedWithErrors.length))
          .replace('{names}', names.join(', '))
          .replace('{more}', more)
      )
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
            msgstr: e.msgstr,
            msgctxt: e.msgctxt || '',
            flags: e.flags || [],
            occurrences: e.occurrences || [],
            tcomment: e.tcomment || '',
          })),
          language_code: targetLang,
          filename: file?.name || 'messages.po',
          po_headers: poHeaders,
        }),
      })
      if (!r.ok) {
        if (r.status === 422) {
          const errData = await r.json()
          const details = (errData.mismatches || []).slice(0, 3).map((m: any) =>
            `"${m.msgid.slice(0, 40)}..." — missing: [${m.missing.join(', ')}]`
          ).join('\n')
          throw new Error(`${errData.error}${details ? '\n' + details : ''}`)
        }
        throw new Error('Export failed')
      }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const now = new Date()
      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const baseName = (file?.name || 'messages.po').replace(/\.po$/, '')
      a.download = `${baseName}-${ts}.po`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      const cc = entries.filter(e => e.status === 'confirmed').length
      const pct = entries.length > 0 ? Math.round((cc / entries.length) * 100) : 0
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      recordHistory({
        action: 'export',
        description: `Exported translated ${file?.name || 'messages.po'}`,
        descriptionKey: 'activity_exported_file',
        descriptionParams: { file: file?.name || 'messages.po' },
        language: langName,
        details: `${cc} confirmed translations`,
        detailsKey: 'activity_new_translations',
        detailsParams: { count: cc, percent: pct },
        user: 'local-user',
      })
    } catch (err: any) { setError(err.message) }
  }, [entries, targetLang, file, poHeaders, formatErrors, t])

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
                setEntries([
                  { index: 0, msgid: 'Power Off', msgstr: '', flags: [], occurrences: [], status: 'pending' },
                  { index: 1, msgid: 'Suspend', msgstr: '', flags: [], occurrences: [], status: 'pending' },
                  { index: 2, msgid: 'Restart...', msgstr: '', flags: [], occurrences: [], status: 'pending' },
                  { index: 3, msgid: 'Power Off...', msgstr: '', flags: [], occurrences: [], status: 'pending' },
                  { index: 4, msgid: 'Log Out...', msgstr: '', flags: [], occurrences: [], status: 'pending' },
                ])
                setCurrentBatch(0)
                setReviewMode(false)
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
                  <span className="text-[var(--tx-primary)] font-semibold">
                    {t('translation_batch_info', 'Batch {current} of {total}')
                      .replace('{current}', String(currentBatch + 1))
                      .replace('{total}', String(totalBatches))}
                  </span>
                  {' \u2014 '}
                  {t('translation_strings_range', '{from}\u2013{to} of {total}')
                    .replace('{from}', String(currentBatch * BATCH_SIZE + 1))
                    .replace('{to}', String(Math.min((currentBatch + 1) * BATCH_SIZE, totalCount)))
                    .replace('{total}', String(totalCount))}
                </span>
                <span className="text-[var(--tx-muted)]">
                  <span className="text-emerald-400 font-semibold">{confirmedCount}</span> {t('translation_confirmed', 'confirmed')}
                </span>
              </div>
              <button
                onClick={handleExport}
                disabled={totalCount === 0 || !hasConfirmedEntry}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Download size={16} />{t('translation_download_progress', 'Download Progress')}
              </button>
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
                    ? <><Loader2 size={18} className="animate-spin" />{t('translation_translating_n', 'Translating {count} strings...').replace('{count}', String(currentBatchEntries.filter(e => e.status === 'pending').length))}</>
                    : <><Sparkles size={18} />{t('translation_translate_batch', 'Translate Batch ({count} strings)').replace('{count}', String(currentBatchEntries.filter(e => e.status === 'pending').length))}</>}
                </button>
                {canReview && (
                  <button
                    onClick={handleStartReview}
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
                            {entry.status === 'translated' || entry.status === 'reviewing'
                              ? t('translation_preview', 'AI Translation \u2014 edit to refine')
                              : t('translation_pending', 'Pending translation')}
                          </p>
                          {entry.status === 'translated' || entry.status === 'reviewing'
                            ? (
                              <textarea
                                value={entry.msgstr}
                                onChange={(e) => handleEditTranslation(entry.index, e.target.value)}
                                className="input-field w-full font-myanmar text-sm min-h-[4rem] resize-y bg-emerald-500/5 border-emerald-500/20 focus:border-ubuntu-orange/50"
                                rows={2}
                                placeholder={t('translation_enter_translation', 'Enter or edit translation...')}
                              />
                            )
                            : <p className="text-[var(--tx-faint)] italic text-sm p-2.5 min-h-[4rem] flex items-center">{t('translation_pending_hint', 'Click Translate Batch to generate')}</p>}
                        </div>
                      </div>
                      {(entry.status === 'translated' || entry.status === 'reviewing') && (
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="text-[var(--tx-muted)]">
                      <span className="text-amber-400 font-semibold">{batchReviewingCount}</span> {t('translation_awaiting_review', 'awaiting review')}
                    </span>
                    <span className="text-[var(--tx-muted)]">
                      <span className="text-emerald-400 font-semibold">{batchConfirmedCount}</span> {t('translation_confirmed_in_batch', 'confirmed in batch')}
                    </span>
                    {batchFormatErrorCount > 0 && (
                      <span className="text-[var(--tx-muted)]">
                        <span className="text-red-400 font-semibold">{batchFormatErrorCount}</span> {t('translation_format_errors', 'format mismatch')}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReviewMode(false)}
                      className="btn-ghost flex items-center gap-2 text-sm text-[var(--tx-muted)] hover:text-[var(--tx-primary)]"
                    >
                      <Edit3 size={16} />{t('translation_back_to_edit', 'Back to Edit')}
                    </button>
                    <button
                      onClick={handleConfirmAllBatch}
                      disabled={batchReviewingCount === batchFormatErrorCount}
                      className="btn-primary flex items-center gap-2 text-sm"
                    >
                      <Check size={16} />{batchFormatErrorCount > 0
                        ? t('translation_confirm_all_fix', 'Confirm Valid ({count})').replace('{count}', String(batchReviewingCount - batchFormatErrorCount))
                        : t('translation_confirm_all_next', 'Confirm All & Next Batch ({count})').replace('{count}', String(batchReviewingCount))}
                    </button>
                  </div>
                </div>
                {batchFormatErrorCount > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">
                      {t('translation_format_error_batch', '{count} entry(s) have format specifier mismatches ({fmtErrors} total). Fix or unconfirm these entries before exporting.').replace('{count}', String(batchFormatErrorCount)).replace('{fmtErrors}', String(totalFormatErrorCount))}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {currentBatchEntries.map(entry => {
                  const isExpanded = expandedEntry === entry.index
                  const isConfirmed = entry.status === 'confirmed'
                  const isReviewing = entry.status === 'reviewing' || entry.status === 'translated'

                  return (
                    <div
                      key={entry.index}
                      className={`glass-card transition-all duration-200 ${
                        isConfirmed
                          ? 'border-l-4 border-l-emerald-500/50'
                          : isReviewing
                            ? 'border-l-4 border-l-amber-400/50'
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
                                    ? 'bg-[rgba(233,84,32,0.05)] border-[rgba(233,84,32,0.3)] focus:border-[rgba(233,84,32,0.6)]'
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
            <button onClick={handleExport} disabled={!hasConfirmedEntry} className="btn-primary flex items-center justify-center gap-2">
              <Download size={18} />{t('translation_download_po', 'Download .po File')}
            </button>
            <button onClick={() => {
              if (file) localStorage.removeItem(`ubuntu-translate-${file.name}-${targetLang}`)
              setStep('upload'); setFile(null); setEntries([]); setCurrentBatch(0); setReviewMode(false)
            }} className="btn-secondary">
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
