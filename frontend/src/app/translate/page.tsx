'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Upload, Languages, Download, FileText, Loader2, CheckCircle,
  AlertCircle, X, Play, Sparkles, Shield, Edit3, Eye, Check,
  ChevronDown, ChevronUp, RotateCcw,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { LANGUAGES, TRANSLATION_CONFIG } from '@/lib/constants'
import { recordHistory } from '@/lib/history'
import Pagination from '@/components/Pagination'

const ENTRIES_PER_PAGE = 10

interface TranslationEntry {
  index: number
  msgid: string
  msgstr: string
  status: 'pending' | 'translated' | 'reviewing' | 'confirmed'
}

export default function TranslatePage() {
  const { t } = useI18n()
  const [step, setStep] = useState<'upload' | 'translate' | 'review' | 'export'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [targetLang, setTargetLang] = useState('my')
  const [entries, setEntries] = useState<TranslationEntry[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const languages = LANGUAGES

  // Auto-save entries to localStorage (debounced)
  useEffect(() => {
    if (!file || entries.length === 0) return
    const key = `ubuntu-translate-${file.name}-${targetLang}`
    const timeout = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(entries))
    }, 500)
    return () => clearTimeout(timeout)
  }, [entries, file, targetLang])

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
      // Check for saved progress
      const saveKey = `ubuntu-translate-${file!.name}-${targetLang}`
      const saved = localStorage.getItem(saveKey)
      let merged: TranslationEntry[]
      if (saved) {
        try {
          const savedEntries: TranslationEntry[] = JSON.parse(saved)
          merged = d.entries.map((e: any) => {
            const s = savedEntries.find((se: TranslationEntry) => se.msgid === e.msgid)
            return s ? { ...e, msgstr: s.msgstr, status: s.status } : { ...e, msgstr: '', status: 'pending' as const }
          })
        } catch {
          merged = d.entries.map((e: any) => ({ ...e, msgstr: '', status: 'pending' as const }))
        }
      } else {
        merged = d.entries.map((e: any) => ({ ...e, msgstr: '', status: 'pending' as const }))
      }
      setEntries(merged)
      setCurrentPage(1)
      setStep('translate')
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      recordHistory({
        action: 'upload',
        description: `Uploaded ${file!.name} for translation`,
        language: langName,
        details: `${merged.length} entries, ${merged.filter(e => e.status === 'pending').length} untranslated`,
        user: 'local-user',
      })
    } catch (err: any) { setError(err.message) }
    finally { setIsTranslating(false) }
  }, [file, targetLang])

  const handleTranslate = useCallback(async () => {
    setIsTranslating(true); setProgress(0); setError(null)
    const batch = entries.filter(e => e.status === 'pending').slice(0, ENTRIES_PER_PAGE)
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
      setEntries(prev => prev.map(e => {
        const m = d.translations.find((t: any) => t.index === e.index)
        return m ? { ...e, msgstr: m.translated, status: 'reviewing' as const } : e
      }))
      setProgress(100)
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      recordHistory({
        action: 'translate',
        description: `Translated ${batch.length} strings with AI`,
        language: langName,
        details: `AI batch translation with Gemini — ${file?.name || 'demo'}`,
        user: 'local-user',
      })
    } catch (err: any) { setError(err.message) }
    finally { setIsTranslating(false) }
  }, [entries, targetLang])

  const handleEditTranslation = useCallback((index: number, newMsgstr: string) => {
    setEntries(prev => prev.map(e =>
      e.index === index ? { ...e, msgstr: newMsgstr } : e
    ))
  }, [])

  const handleConfirmEntry = useCallback((index: number) => {
    setEntries(prev => prev.map(e =>
      e.index === index ? { ...e, status: 'confirmed' as const } : e
    ))
  }, [])

  const handleUnconfirmEntry = useCallback((index: number) => {
    setEntries(prev => prev.map(e =>
      e.index === index ? { ...e, status: 'reviewing' as const } : e
    ))
  }, [])

  const handleConfirmAll = useCallback(() => {
    const pageStart = (currentPage - 1) * ENTRIES_PER_PAGE
    const pageEnd = currentPage * ENTRIES_PER_PAGE
    setEntries(prev => prev.map((e, i) =>
      i >= pageStart && i < pageEnd && (e.status === 'reviewing' || e.status === 'translated')
        ? { ...e, status: 'confirmed' as const }
        : e
    ))
  }, [currentPage])

  const handleResetToAI = useCallback((index: number) => {
    // Re-trigger single entry translation would be expensive; mark as pending for re-translate
    setEntries(prev => prev.map(e =>
      e.index === index ? { ...e, msgstr: '', status: 'pending' as const } : e
    ))
  }, [])

  const handleExport = useCallback(async () => {
    try {
      const r = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: entries.map(e => ({ index: e.index, msgid: e.msgid, msgstr: e.msgstr })),
          language_code: targetLang,
          filename: file?.name || 'messages.po',
        }),
      })
      if (!r.ok) throw new Error('Export failed')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const now = new Date()
      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
      const baseName = (file?.name || 'messages.po').replace(/\.pot?$/, '')
      a.download = `${baseName}-${ts}.po`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      const confirmedCount = entries.filter(e => e.status === 'confirmed').length
      const langName = LANGUAGES.find(l => l.code === targetLang)?.name || targetLang
      recordHistory({
        action: 'export',
        description: `Exported translated ${file?.name || 'messages.po'}`,
        language: langName,
        details: `${confirmedCount} confirmed translations`,
        user: 'local-user',
      })
    } catch (err: any) { setError(err.message) }
  }, [entries, targetLang, file])

  const translatedCount = entries.filter(e => e.status === 'translated' || e.status === 'reviewing' || e.status === 'confirmed').length
  const confirmedCount = entries.filter(e => e.status === 'confirmed').length
  const reviewingCount = entries.filter(e => e.status === 'reviewing').length
  const untranslatedCount = entries.filter(e => e.status === 'pending').length
  const totalCount = entries.length

  const totalPages = Math.ceil(entries.length / ENTRIES_PER_PAGE)
  const paginatedEntries = useMemo(
    () => entries.slice((currentPage - 1) * ENTRIES_PER_PAGE, currentPage * ENTRIES_PER_PAGE),
    [entries, currentPage]
  )
  const pageReviewingCount = useMemo(
    () => paginatedEntries.filter(e => e.status === 'reviewing').length,
    [paginatedEntries]
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('translation_title', 'Translation')}</h1>
          <Sparkles className="text-ubuntu-orange animate-pulse-slow" size={24} />
        </div>
        <p className="text-[var(--tx-muted)] mt-1">{t('translation_subtitle', 'AI-powered translation using Google Gemini 2.5 Flash')}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        {[
          { key: 'upload', label: t('translation_step_upload', 'Upload'), icon: Upload },
          { key: 'translate', label: t('translation_step_translate', 'Translate'), icon: Languages },
          { key: 'review', label: t('translation_step_review', 'Review'), icon: Eye },
          { key: 'export', label: t('translation_step_export', 'Export'), icon: Download },
        ].map((s, idx) => {
          const steps = ['upload', 'translate', 'review', 'export']
          const stepIdx = steps.indexOf(step)
          const isCompleted = idx < stepIdx
          const isActive = step === s.key
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

      {/* ════════════════ UPLOAD STEP ════════════════ */}
      {step === 'upload' && (
        <div className="glass-card p-8">
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
                <input type="file" accept=".po,.pot" onChange={handleFileSelect} className="hidden" />
                {file ? (
                  <div className="text-center">
                    <FileText className="mx-auto text-ubuntu-orange mb-2" size={32} />
                    <p className="text-[var(--tx-primary)] font-medium">{file.name}</p>
                    <p className="text-sm text-[var(--tx-muted)]">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto text-[var(--tx-dim)] mb-2" size={32} />
                    <p className="text-[var(--tx-muted)]">{t('translation_drop_hint', 'Drop .po or .pot file here or click to browse')}</p>
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
                  { index: 0, msgid: 'Power Off', msgstr: '', status: 'pending' },
                  { index: 1, msgid: 'Suspend', msgstr: '', status: 'pending' },
                  { index: 2, msgid: 'Restart...', msgstr: '', status: 'pending' },
                  { index: 3, msgid: 'Power Off...', msgstr: '', status: 'pending' },
                  { index: 4, msgid: 'Log Out...', msgstr: '', status: 'pending' },
                ])
                setStep('translate')
              }} className="btn-secondary flex items-center gap-2 mx-auto">
                <Play size={16} />{t('translation_try_demo', 'Try Demo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ TRANSLATE STEP ════════════════ */}
      {step === 'translate' && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--tx-muted)]">{t('translation_progress', 'Progress')}</span>
              <span className="text-[var(--tx-primary)] font-medium">
                {confirmedCount} confirmed / {totalCount} total ({untranslatedCount} untranslated)
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${totalCount ? (translatedCount / totalCount) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleTranslate}
              disabled={isTranslating || untranslatedCount === 0}
              className="btn-primary flex items-center gap-2"
            >
              {isTranslating
                ? <><Loader2 size={18} className="animate-spin" />Translating {Math.min(ENTRIES_PER_PAGE, untranslatedCount)} strings...</>
                : <><Sparkles size={18} />To Translate (next {Math.min(ENTRIES_PER_PAGE, untranslatedCount)})</>}
            </button>
            {translatedCount > 0 && (
              <button onClick={() => setStep('review')} className="btn-secondary flex items-center gap-2">
                <Eye size={18} />Review Translations
              </button>
            )}
          </div>

          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-[var(--border-light)]">
              {paginatedEntries.map(entry => (
                <div key={entry.index} className="p-4 hover:bg-[var(--surface-overlay)] transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--tx-dim)] mb-1 flex items-center gap-1">
                        <FileText size={10} />{t('translation_source', 'Source')}
                      </p>
                      <p className="text-[var(--tx-primary)] font-mono text-sm bg-[var(--surface-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">
                        {entry.msgid}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--tx-dim)] mb-1 flex items-center gap-1">
                        <Languages size={10} />
                        {entry.status === 'translated' || entry.status === 'reviewing'
                          ? t('translation_preview', 'AI Translation — edit to refine')
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
                        : <p className="text-[var(--tx-faint)] italic text-sm p-2.5">{t('translation_pending_hint', 'Click To Translate to generate')}</p>}
                    </div>
                  </div>
                  {(entry.status === 'translated' || entry.status === 'reviewing') && (
                    <div className="flex items-center gap-2 mt-2 ml-auto">
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <Sparkles size={10} />{t('translation_ai_generated', 'AI-generated — edit to refine')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* ════════════════ REVIEW STEP ════════════════ */}
      {step === 'review' && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="glass-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className="text-[var(--tx-muted)]">
                  <span className="text-amber-400 font-semibold">{reviewingCount}</span> awaiting review
                </span>
                <span className="text-[var(--tx-muted)]">
                  <span className="text-emerald-400 font-semibold">{confirmedCount}</span> confirmed
                </span>
                <span className="text-[var(--tx-muted)]">
                  <span className="text-[var(--tx-dim)] font-semibold">{untranslatedCount}</span> untranslated
                </span>
                <span className="text-[var(--tx-muted)]">
                  <span className="text-[var(--tx-primary)] font-semibold">{totalCount}</span> total
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmAll}
                  disabled={reviewingCount === 0}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  <Check size={16} />Confirm Page ({pageReviewingCount})
                </button>
                <button
                  onClick={() => setStep('export')}
                  disabled={confirmedCount === 0}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Download size={16} />Export ({confirmedCount} confirmed)
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

          {/* Editable translation entries */}
          <div className="space-y-3">
            {paginatedEntries.map(entry => {
              const isExpanded = expandedEntry === entry.index
              const isConfirmed = entry.status === 'confirmed'
              const isReviewing = entry.status === 'reviewing'

              return (
                <div
                  key={entry.index}
                  className={`glass-card overflow-hidden transition-all duration-200 ${
                    isConfirmed
                      ? 'border-l-4 border-l-emerald-500/50'
                      : isReviewing
                        ? 'border-l-4 border-l-amber-400/50'
                        : 'border-l-4 border-l-[var(--border-theme)]'
                  }`}
                >
                  {/* Header row */}
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
                        {entry.msgstr || '(empty)'}
                      </p>
                    </div>
                    <span className={`badge flex-shrink-0 ${
                      isConfirmed ? 'badge-green' : isReviewing ? 'badge-yellow' : 'badge-orange'
                    }`}>
                      {isConfirmed ? 'Confirmed' : isReviewing ? 'Needs Review' : 'Pending'}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-[var(--tx-dim)]" /> : <ChevronDown size={16} className="text-[var(--tx-dim)]" />}
                  </button>

                  {/* Expanded editor */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[var(--border-light)]">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                        {/* Source */}
                        <div>
                          <label className="text-xs text-[var(--tx-dim)] mb-2 block flex items-center gap-1">
                            <FileText size={10} />Source Text
                          </label>
                          <div className="font-mono text-sm bg-[var(--surface-overlay)] p-3 rounded-lg border border-[var(--border-light)] text-[var(--tx-primary)] whitespace-pre-wrap">
                            {entry.msgid}
                          </div>
                        </div>

                        {/* Editable translation */}
                        <div>
                          <label className="text-xs text-[var(--tx-dim)] mb-2 block flex items-center gap-1">
                            <Edit3 size={10} />
                            Translation {isReviewing && <span className="text-amber-400">(AI-generated — review & edit)</span>}
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
                            placeholder="Enter translation..."
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {isConfirmed ? (
                          <button
                            onClick={() => handleUnconfirmEntry(entry.index)}
                            className="btn-ghost flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300"
                          >
                            <RotateCcw size={14} />Unconfirm
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConfirmEntry(entry.index)}
                            disabled={!entry.msgstr}
                            className="btn-primary flex items-center gap-1.5 text-sm"
                          >
                            <Check size={14} />Confirm Translation
                          </button>
                        )}
                        <button
                          onClick={() => handleResetToAI(entry.index)}
                          className="btn-ghost flex items-center gap-1.5 text-sm text-[var(--tx-muted)] hover:text-[var(--tx-primary)]"
                        >
                          <RotateCcw size={14} />Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* ════════════════ EXPORT STEP ════════════════ */}
      {step === 'export' && (
        <div className="glass-card p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-emerald-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[var(--tx-primary)] mb-2">
            {t('translation_complete', 'Translation Complete!')}
          </h2>
          <p className="text-[var(--tx-muted)] mb-1">
            {confirmedCount} strings confirmed and ready to export
          </p>
          <p className="text-[var(--tx-dim)] text-sm mb-6">
            Translated to {languages.find(l => l.code === targetLang)?.name} ({languages.find(l => l.code === targetLang)?.native})
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={handleExport} className="btn-primary flex items-center justify-center gap-2">
              <Download size={18} />{t('translation_download_po', 'Download .po File')}
            </button>
            <button onClick={() => {
              if (file) localStorage.removeItem(`ubuntu-translate-${file.name}-${targetLang}`)
              setStep('upload'); setFile(null); setEntries([])
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
