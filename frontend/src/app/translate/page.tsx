'use client'

import { useState, useCallback } from 'react'
import {
  Upload,
  Languages,
  Download,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Play,
  Sparkles,
  Shield,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface TranslationEntry {
  index: number
  msgid: string
  msgstr: string
  status: 'pending' | 'translated' | 'reviewing'
}

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
    { code: 'ksw', name: 'S\'gaw Karen', native: 'စကောကရင်' },
  ]

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    if (!selectedFile.name.endsWith('.po') && !selectedFile.name.endsWith('.pot')) {
      setError('Only .po and .pot files are supported')
      return
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum size is 50 MB.')
      return
    }
    setFile(selectedFile)
    setError(null)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return
    setIsTranslating(true)
    setError(null)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('target_lang', targetLang)
    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Upload failed') }
      const data = await response.json()
      setEntries(data.entries)
      setStep('translate')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsTranslating(false)
    }
  }, [file, targetLang])

  const handleTranslate = useCallback(async () => {
    setIsTranslating(true)
    setProgress(0)
    setError(null)
    const untranslated = entries.filter(e => e.status === 'pending')
    const batchSize = 15
    let translated = 0
    try {
      for (let i = 0; i < untranslated.length; i += batchSize) {
        const batch = untranslated.slice(i, i + batchSize)
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: batch.map(e => ({ index: e.index, msgid: e.msgid })), target_lang: targetLang }),
        })
        if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Translation failed') }
        const data = await response.json()
        setEntries(prev => prev.map(entry => {
          const result = data.translations.find((t: { index: number }) => t.index === entry.index)
          if (result) return { ...entry, msgstr: result.translated, status: 'translated' as const }
          return entry
        }))
        translated += batch.length
        setProgress(Math.round((translated / untranslated.length) * 100))
      }
      setStep('export')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setIsTranslating(false)
    }
  }, [entries, targetLang])

  const handleExport = useCallback(async () => {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: entries.map(e => ({ index: e.index, msgid: e.msgid, msgstr: e.msgstr })), language_code: targetLang, filename: file?.name || 'messages.po' }),
      })
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `translated_${targetLang}_${file?.name || 'messages.po'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }, [entries, targetLang, file])

  const translatedCount = entries.filter(e => e.status === 'translated').length
  const totalCount = entries.length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-white">{t('translation_title', 'Translation')}</h1>
          <Sparkles className="text-ubuntu-orange animate-pulse-slow" size={24} />
        </div>
        <p className="text-white/50 mt-1">{t('translation_subtitle', 'AI-powered translation using Google Gemini 2.5 Flash')}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-4">
        {[
          { key: 'upload', label: t('translation_upload_step', 'Upload'), icon: Upload },
          { key: 'translate', label: t('translation_translate_step', 'Translate'), icon: Languages },
          { key: 'export', label: t('translation_export_step', 'Export'), icon: Download },
        ].map((s, idx) => {
          const stepIdx = ['upload', 'translate', 'export'].indexOf(step)
          const isCompleted = idx < stepIdx
          const isActive = step === s.key
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`step-dot ${isActive ? 'active' : isCompleted ? 'completed' : 'pending'}`}>
                {isCompleted ? <CheckCircle size={20} /> : <s.icon size={20} />}
              </div>
              <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-white/30'}`}>{s.label}</span>
              {idx < 2 && <div className={`step-line ${isCompleted ? 'completed' : ''}`} />}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="glass-card p-4 border-l-4 border-red-500/50">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-400" size={20} />
            <p className="text-white text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X size={18} className="text-white/50 hover:text-white" /></button>
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="glass-card p-8">
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <label className="block text-sm text-white/50 mb-2">{t('translation_target_language', 'Target Language')}</label>
              <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="input-field w-full">
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.name} ({lang.native})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-2">{t('translation_po_file', '.po File')}</label>
              <label className={`upload-zone ${file ? 'has-file' : ''}`}>
                <input type="file" accept=".po,.pot" onChange={handleFileSelect} className="hidden" />
                {file ? (
                  <div className="text-center">
                    <FileText className="mx-auto text-ubuntu-orange mb-2" size={32} />
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-sm text-white/50">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto text-white/30 mb-2" size={32} />
                    <p className="text-white/50">{t('translation_drop_hint', 'Drop .po or .pot file here or click to browse')}</p>
                    <p className="text-xs text-white/30 mt-1">{t('translation_max_size', 'Maximum 50 MB')}</p>
                  </div>
                )}
              </label>
            </div>
            <button onClick={handleUpload} disabled={!file || isTranslating} className="btn-primary w-full flex items-center justify-center gap-2">
              {isTranslating ? <><Loader2 size={18} className="animate-spin" />{t('translation_parsing', 'Parsing...')}</> : <><Upload size={18} />{t('translation_upload_parse', 'Upload & Parse')}</>}
            </button>
            <div className="text-center">
              <p className="text-sm text-white/30 mb-2">{t('translation_no_file', 'No .po file handy?')}</p>
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

      {step === 'translate' && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50">{t('translation_progress', 'Progress')}</span>
              <span className="text-white font-medium">{translatedCount} / {totalCount} {t('translation_strings', 'strings')}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${(translatedCount / totalCount) * 100}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <button onClick={handleTranslate} disabled={isTranslating || translatedCount === totalCount} className="btn-primary flex items-center gap-2">
              {isTranslating ? <><Loader2 size={18} className="animate-spin" />{t('translation_translating', 'Translating...')} {progress}%</> : <><Sparkles size={18} />{t('translation_ai_translate', 'AI Translate')} ({totalCount - translatedCount} {t('translation_remaining', 'remaining')})</>}
            </button>
            {translatedCount > 0 && <button onClick={() => setStep('export')} className="btn-secondary flex items-center gap-2"><Download size={18} />{t('translation_export', 'Export')}</button>}
          </div>
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-white/[0.06]">
              {entries.map((entry) => (
                <div key={entry.index} className="p-4 hover:bg-white/[0.03] transition-colors">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-white/30 mb-1 flex items-center gap-1"><FileText size={10} />{t('translation_source', 'Source')}</p>
                      <p className="text-white font-mono text-sm bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.06]">{entry.msgid}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1 flex items-center gap-1"><Languages size={10} />{t('translation_translation', 'Translation')}</p>
                      {entry.status === 'translated' ? (
                        <p className="text-emerald-400 font-myanmar text-sm bg-emerald-500/[0.06] p-2.5 rounded-lg border border-emerald-500/10">{entry.msgstr}</p>
                      ) : (
                        <p className="text-white/20 italic text-sm p-2.5">{t('translation_pending', 'Pending translation')}</p>
                      )}
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
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-emerald-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{t('translation_complete', 'Translation Complete!')}</h2>
          <p className="text-white/50 mb-6">{translatedCount} {t('translation_translated_to', 'strings translated to')} {languages.find(l => l.code === targetLang)?.name}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button onClick={handleExport} className="btn-primary flex items-center justify-center gap-2"><Download size={18} />{t('translation_download_po', 'Download .po File')}</button>
            <button onClick={() => { setStep('upload'); setFile(null); setEntries([]) }} className="btn-secondary">{t('translation_start_new', 'Start New')}</button>
          </div>
          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-center gap-2 text-xs text-white/30">
              <Shield size={12} />
              <span>{t('translation_qa_verified', 'QA verified with placeholder integrity checks')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
