'use client'

import { useState, useCallback } from 'react'
import { Upload, Languages, Download, FileText, Loader2, CheckCircle, AlertCircle, X, Play, Sparkles, Shield } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface TranslationEntry { index: number; msgid: string; msgstr: string; status: 'pending' | 'translated' | 'reviewing' }

export default function TranslatePage() {
  const { t } = useI18n()
  const [step, setStep] = useState<'upload' | 'translate' | 'export'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [targetLang, setTargetLang] = useState('my')
  const [entries, setEntries] = useState<TranslationEntry[]>([])
  const [isTranslating, setIsTranslating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const languages = [
    { code: 'my', name: 'Myanmar', native: 'မြန်မာ' },
    { code: 'shn', name: 'Shan', native: 'ရှမ်း' },
    { code: 'mnw', name: 'Mon', native: 'မွန်' },
    { code: 'ksw', name: "S'gaw Karen", native: 'စကောကရင်' },
  ]

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.po') && !f.name.endsWith('.pot')) { setError('Only .po and .pot files are supported'); return }
    if (f.size > 50 * 1024 * 1024) { setError('File too large. Maximum size is 50 MB.'); return }
    setFile(f); setError(null)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return
    setIsTranslating(true); setError(null)
    const fd = new FormData(); fd.append('file', file); fd.append('target_lang', targetLang)
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Upload failed') }
      const d = await r.json(); setEntries(d.entries); setStep('translate')
    } catch (err: any) { setError(err.message) }
    finally { setIsTranslating(false) }
  }, [file, targetLang])

  const handleTranslate = useCallback(async () => {
    setIsTranslating(true); setProgress(0); setError(null)
    const untranslated = entries.filter(e => e.status === 'pending')
    let translated = 0
    try {
      for (let i = 0; i < untranslated.length; i += 15) {
        const batch = untranslated.slice(i, i + 15)
        const r = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries: batch.map(e => ({ index: e.index, msgid: e.msgid })), target_lang: targetLang }) })
        if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Translation failed') }
        const d = await r.json()
        setEntries(prev => prev.map(e => { const m = d.translations.find((t: any) => t.index === e.index); return m ? { ...e, msgstr: m.translated, status: 'translated' as const } : e }))
        translated += batch.length
        setProgress(Math.round((translated / untranslated.length) * 100))
      }
      setStep('export')
    } catch (err: any) { setError(err.message) }
    finally { setIsTranslating(false) }
  }, [entries, targetLang])

  const handleExport = useCallback(async () => {
    try {
      const r = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries: entries.map(e => ({ index: e.index, msgid: e.msgid, msgstr: e.msgstr })), language_code: targetLang, filename: file?.name || 'messages.po' }) })
      if (!r.ok) throw new Error('Export failed')
      const blob = await r.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `translated_${targetLang}_${file?.name || 'messages.po'}`
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (err: any) { setError(err.message) }
  }, [entries, targetLang, file])

  const translatedCount = entries.filter(e => e.status === 'translated').length
  const totalCount = entries.length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('translation_title', 'Translation')}</h1>
          <Sparkles className="text-ubuntu-orange animate-pulse-slow" size={24} />
        </div>
        <p className="text-[var(--tx-muted)] mt-1">{t('translation_subtitle', 'AI-powered translation using Google Gemini 2.5 Flash')}</p>
      </div>

      <div className="flex items-center justify-center gap-4">
        {[{ key: 'upload', label: t('translation_upload_step', 'Upload'), icon: Upload }, { key: 'translate', label: t('translation_translate_step', 'Translate'), icon: Languages }, { key: 'export', label: t('translation_export_step', 'Export'), icon: Download }].map((s, idx) => {
          const stepIdx = ['upload', 'translate', 'export'].indexOf(step)
          const isCompleted = idx < stepIdx; const isActive = step === s.key
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`step-dot ${isActive ? 'active' : isCompleted ? 'completed' : 'pending'}`}>
                {isCompleted ? <CheckCircle size={20} /> : <s.icon size={20} />}
              </div>
              <span className={`text-sm ${isActive ? 'text-[var(--tx-primary)] font-medium' : 'text-[var(--tx-dim)]'}`}>{s.label}</span>
              {idx < 2 && <div className={`step-line ${isCompleted ? 'completed' : ''}`} />}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="glass-card p-4 border-l-4 border-red-500/50">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-400" size={20} />
            <p className="text-[var(--tx-primary)] text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X size={18} className="text-[var(--tx-muted)] hover:text-[var(--tx-primary)]" /></button>
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="glass-card p-8">
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <label className="block text-sm text-[var(--tx-muted)] mb-2">{t('translation_target_language', 'Target Language')}</label>
              <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="input-field w-full">
                {languages.map(l => (<option key={l.code} value={l.code}>{l.name} ({l.native})</option>))}
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
              {isTranslating ? <><Loader2 size={18} className="animate-spin" />{t('translation_parsing', 'Parsing...')}</> : <><Upload size={18} />{t('translation_upload_parse', 'Upload & Parse')}</>}
            </button>
            <div className="text-center">
              <p className="text-sm text-[var(--tx-dim)] mb-2">{t('translation_no_file', 'No .po file handy?')}</p>
              <button onClick={() => { setEntries([{ index: 0, msgid: 'Power Off', msgstr: '', status: 'pending' }, { index: 1, msgid: 'Suspend', msgstr: '', status: 'pending' }, { index: 2, msgid: 'Restart...', msgstr: '', status: 'pending' }, { index: 3, msgid: 'Power Off...', msgstr: '', status: 'pending' }, { index: 4, msgid: 'Log Out...', msgstr: '', status: 'pending' }]); setStep('translate') }} className="btn-secondary flex items-center gap-2 mx-auto">
                <Play size={16} />{t('translation_try_demo', 'Try Demo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'translate' && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--tx-muted)]">{t('translation_progress', 'Progress')}</span>
              <span className="text-[var(--tx-primary)] font-medium">{translatedCount} / {totalCount} {t('translation_strings', 'strings')}</span>
            </div>
            <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${(translatedCount / totalCount) * 100}%` }} /></div>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={handleTranslate} disabled={isTranslating || translatedCount === totalCount} className="btn-primary flex items-center gap-2">
              {isTranslating ? <><Loader2 size={18} className="animate-spin" />{t('translation_translating', 'Translating...')} {progress}%</> : <><Sparkles size={18} />{t('translation_ai_translate', 'AI Translate')} ({totalCount - translatedCount} {t('translation_remaining', 'remaining')})</>}
            </button>
            {translatedCount > 0 && <button onClick={() => setStep('export')} className="btn-secondary flex items-center gap-2"><Download size={18} />{t('translation_export', 'Export')}</button>}
          </div>
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-[var(--border-light)]">
              {entries.map(entry => (
                <div key={entry.index} className="p-4 hover:bg-[var(--surface-overlay)] transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--tx-dim)] mb-1 flex items-center gap-1"><FileText size={10} />{t('translation_source', 'Source')}</p>
                      <p className="text-[var(--tx-primary)] font-mono text-sm bg-[var(--surface-overlay)] p-2.5 rounded-lg border border-[var(--border-light)]">{entry.msgid}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--tx-dim)] mb-1 flex items-center gap-1"><Languages size={10} />{t('translation_translation', 'Translation')}</p>
                      {entry.status === 'translated'
                        ? <p className="text-emerald-400 font-myanmar text-sm bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/15">{entry.msgstr}</p>
                        : <p className="text-[var(--tx-faint)] italic text-sm p-2.5">{t('translation_pending', 'Pending translation')}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'export' && (
        <div className="glass-card p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"><CheckCircle className="text-emerald-400" size={32} /></div>
          <h2 className="text-2xl font-bold text-[var(--tx-primary)] mb-2">{t('translation_complete', 'Translation Complete!')}</h2>
          <p className="text-[var(--tx-muted)] mb-6">{translatedCount} {t('translation_translated_to', 'strings translated to')} {languages.find(l => l.code === targetLang)?.name}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={handleExport} className="btn-primary flex items-center justify-center gap-2"><Download size={18} />{t('translation_download_po', 'Download .po File')}</button>
            <button onClick={() => { setStep('upload'); setFile(null); setEntries([]) }} className="btn-secondary">{t('translation_start_new', 'Start New')}</button>
          </div>
          <div className="mt-6 pt-4 border-t border-[var(--border-light)]">
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--tx-dim)]"><Shield size={12} /><span>{t('translation_qa_verified', 'QA verified with placeholder integrity checks')}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
