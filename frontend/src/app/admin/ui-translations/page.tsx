'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Settings, Save, Loader2, Search, Clock, AlertCircle, CheckCircle2,
  X, ChevronDown, ChevronUp, Filter, Eye, EyeOff, Languages,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type LanguageCode = 'en' | 'my' | 'shn' | 'mnw' | 'ksw'

const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'my', label: 'Burmese', native: 'ဗမာ' },
  { code: 'shn', label: 'Shan', native: 'ရှမ်း' },
  { code: 'mnw', label: 'Mon', native: 'မွန်' },
  { code: 'ksw', label: "S'gaw Karen", native: 'စကောကရင်' },
]

interface TranslationHistoryEntry {
  id: number
  userId: number | null
  lang: string
  key: string
  oldValue: string | null
  newValue: string | null
  username: string | null
  displayName: string | null
  createdAt: number
}

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text().catch(() => '')
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type FilterMode = 'all' | 'unsaved' | 'missing'

export default function UiTranslationsPage() {
  const { t } = useI18n()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const listRef = useRef<HTMLDivElement>(null)

  // Data state
  const [allKeys, setAllKeys] = useState<string[]>([])
  const [dbKeys, setDbKeys] = useState<string[]>([])
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({})
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null)
  const [saveMsg, setSaveMsg] = useState('')

  // UI state
  const [search, setSearch] = useState('')
  const [activeLang, setActiveLang] = useState<LanguageCode>('my')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<TranslationHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [showMissingFilter, setShowMissingFilter] = useState(false)

  // ── Load translations ──────────────────────────────────────────
  const loadTranslations = useCallback(async () => {
    try {
      const staticRes = await fetch('/api/admin/ui-translations')
      if (!staticRes.ok) throw new Error('Failed to fetch')
      const staticData = await safeJson(staticRes)
      const dbTranslations = (staticData && typeof staticData.translations === 'object'
        ? staticData.translations : {}) as Record<string, Record<string, string>>
      const dbKeysList = Array.isArray(staticData?.keys) ? staticData.keys as string[] : []

      const enJson: Record<string, string> = (await import('@/data/i18n/en.json')).default
      const allStaticKeys = Object.keys(enJson).sort()

      const merged = new Set([...allStaticKeys, ...dbKeysList])
      const sorted = Array.from(merged).sort()

      setDbKeys(dbKeysList)
      setAllKeys(sorted)

      const rows: Record<string, Record<string, string>> = {}
      for (const key of sorted) {
        rows[key] = {
          en: dbTranslations.en?.[key] || enJson[key] || '',
          my: dbTranslations.my?.[key] || '',
          shn: dbTranslations.shn?.[key] || '',
          mnw: dbTranslations.mnw?.[key] || '',
          ksw: dbTranslations.ksw?.[key] || '',
        }
      }
      setTranslations(rows)
      setEditing(rows)
    } catch (err) {
      console.error('Failed to load translations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Load history ───────────────────────────────────────────────
  const loadHistory = useCallback(async (lang?: string) => {
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (lang) params.set('lang', lang)
      const res = await fetch(`/api/admin/ui-translations/history?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await safeJson(res)
        setHistory(Array.isArray(data?.entries) ? data.entries as TranslationHistoryEntry[] : [])
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // ── Auth guard ─────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) router.push('/')
    if (!authLoading && user && !user.isAdmin) router.push('/')
  }, [user, authLoading, router])

  useEffect(() => {
    if (user?.isAdmin) loadTranslations()
  }, [user, loadTranslations])

  useEffect(() => {
    if (showHistory) loadHistory()
  }, [showHistory, loadHistory])

  // ── Compute actual dirty keys (compare editing vs translations) ─
  const dirtyKeySet = useMemo(() => {
    const dirty = new Set<string>()
    for (const key of allKeys) {
      for (const lang of ['en', 'my', 'shn', 'mnw', 'ksw'] as LanguageCode[]) {
        if (editing[key]?.[lang] !== translations[key]?.[lang]) {
          dirty.add(key)
          break
        }
      }
    }
    return dirty
  }, [allKeys, editing, translations])

  // ── Warn before leaving with unsaved changes ───────────────────
  const dirtyCountRef = useRef(0)
  dirtyCountRef.current = dirtyKeySet.size
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyCountRef.current > 0) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ── Per-language dirty count ────────────────────────────────────
  const dirtyCount = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const key of allKeys) {
      for (const lang of ['my', 'shn', 'mnw', 'ksw'] as LanguageCode[]) {
        if (editing[key]?.[lang] !== translations[key]?.[lang]) {
          counts[lang] = (counts[lang] || 0) + 1
        }
      }
    }
    return counts
  }, [allKeys, editing, translations])

  // ── Language summary stats ──────────────────────────────────────
  const langStats = useMemo(() => {
    const stats: Record<string, { translated: number; missing: number; unsaved: number }> = {}
    for (const lang of ['my', 'shn', 'mnw', 'ksw'] as LanguageCode[]) {
      let translated = 0
      let missing = 0
      let unsaved = 0
      for (const key of allKeys) {
        const savedVal = translations[key]?.[lang] || ''
        const editVal = editing[key]?.[lang] || ''
        if (savedVal) {
          translated++
        } else {
          missing++
        }
        if (editVal !== savedVal) {
          unsaved++
        }
      }
      stats[lang] = { translated, missing, unsaved }
    }
    return stats
  }, [allKeys, translations, editing])

  // ── Handle edit ────────────────────────────────────────────────
  const handleEdit = useCallback((key: string, lang: LanguageCode, value: string) => {
    setEditing(prev => ({
      ...prev,
      [key]: { ...prev[key], [lang]: value },
    }))
  }, [])

  // ── Save single language ───────────────────────────────────────
  const handleSave = useCallback(async (lang: LanguageCode) => {
    setSaving(true)
    setSaveStatus(null)
    try {
      const changed: Record<string, string> = {}
      for (const key of dirtyKeySet) {
        const newVal = editing[key]?.[lang] || ''
        const oldVal = translations[key]?.[lang] || ''
        if (newVal !== oldVal) {
          changed[key] = newVal
        }
      }

      if (Object.keys(changed).length === 0) {
        setSaveStatus('success')
        setSaveMsg('No changes to save')
        setSaving(false)
        return
      }

      const res = await fetch('/api/admin/ui-translations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lang, translations: changed }),
      })

      if (!res.ok) {
        const data = await safeJson(res)
        throw new Error(
          (data && typeof data.error === 'string' ? data.error : null) ||
          `Save failed (HTTP ${res.status})`,
        )
      }

      // Atomically update saved state: only change saved keys
      setTranslations(prev => {
        const next = { ...prev }
        for (const key of Object.keys(changed)) {
          next[key] = { ...next[key], [lang]: changed[key] }
        }
        return next
      })

      setSaveStatus('success')
      setSaveMsg(`Saved ${Object.keys(changed).length} translation(s) for ${lang.toUpperCase()}`)
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (err: any) {
      setSaveStatus('error')
      setSaveMsg(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [dirtyKeySet, editing, translations])

  // ── Save all languages ─────────────────────────────────────────
  const handleSaveAll = useCallback(async () => {
    setSaving(true)
    setSaveStatus(null)
    let totalSaved = 0
    const errors: string[] = []
    try {
      for (const lang of ['my', 'shn', 'mnw', 'ksw'] as LanguageCode[]) {
        const changed: Record<string, string> = {}
        for (const key of dirtyKeySet) {
          const newVal = editing[key]?.[lang] || ''
          const oldVal = translations[key]?.[lang] || ''
          if (newVal !== oldVal) {
            changed[key] = newVal
          }
        }
        if (Object.keys(changed).length > 0) {
          const res = await fetch('/api/admin/ui-translations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ lang, translations: changed }),
          })
          if (res.ok) {
            totalSaved += Object.keys(changed).length
            // Update saved state for this language
            setTranslations(prev => {
              const next = { ...prev }
              for (const key of Object.keys(changed)) {
                next[key] = { ...next[key], [lang]: changed[key] }
              }
              return next
            })
          } else {
            const data = await safeJson(res)
            errors.push(`${lang}: ${data?.error || `HTTP ${res.status}`}`)
          }
        }
      }

      if (errors.length > 0) {
        setSaveStatus('error')
        setSaveMsg(`Partial save: ${errors.join('; ')}`)
      } else {
        setSaveStatus('success')
        setSaveMsg(`Saved ${totalSaved} translation(s) across all languages`)
        setTimeout(() => setSaveStatus(null), 3000)
      }
    } catch (err: any) {
      setSaveStatus('error')
      setSaveMsg(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [dirtyKeySet, editing, translations])

  // ── Filter keys ────────────────────────────────────────────────
  const filteredKeys = useMemo(() => {
    let keys = allKeys

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      keys = keys.filter(key => {
        if (key.toLowerCase().includes(q)) return true
        const row = editing[key]
        if (!row) return false
        return Object.values(row).some(v => v.toLowerCase().includes(q))
      })
    }

    // Unsaved filter
    if (filterMode === 'unsaved') {
      keys = keys.filter(key => dirtyKeySet.has(key))
    }

    // Missing filter
    if (showMissingFilter) {
      keys = keys.filter(key => {
        const val = translations[key]?.[activeLang] || ''
        return !val
      })
    }

    return keys
  }, [allKeys, search, editing, filterMode, dirtyKeySet, showMissingFilter, translations, activeLang])

  // ── Group keys by prefix ───────────────────────────────────────
  const groupedKeys = useMemo(() => {
    const groups: Record<string, string[]> = {}
    for (const key of filteredKeys) {
      const prefix = key.split('_')[0] || 'other'
      if (!groups[prefix]) groups[prefix] = []
      groups[prefix].push(key)
    }
    return groups
  }, [filteredKeys])

  // ── Get saved value for display ────────────────────────────────
  const getSaved = useCallback((key: string, lang: LanguageCode) => {
    return translations[key]?.[lang] || ''
  }, [translations])

  const getDraft = useCallback((key: string, lang: LanguageCode) => {
    return editing[key]?.[lang] || ''
  }, [editing])

  const isKeyDirty = useCallback((key: string, lang: LanguageCode) => {
    return getDraft(key, lang) !== getSaved(key, lang)
  }, [getDraft, getSaved])

  // ── Auth loading ───────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-ubuntu-orange" />
      </div>
    )
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle size={48} className="text-red-400" />
        <p className="text-[var(--tx-muted)]">Admin access required</p>
        <Link href="/" className="btn-primary">Go to Dashboard</Link>
      </div>
    )
  }

  const totalDirty = dirtyKeySet.size

  return (
    <div className="max-w-full space-y-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-ubuntu-orange/20">
            <Settings size={24} className="text-ubuntu-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--tx-primary)]">
              {t('admin_ui_translations_title', 'UI Translations')}
            </h1>
            <p className="text-sm text-[var(--tx-muted)]">
              {t('admin_ui_translations_subtitle', 'Manage interface translations for all languages')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors self-start ${
            showHistory
              ? 'bg-ubuntu-orange/20 text-ubuntu-orange'
              : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'
          }`}
        >
          <Clock size={16} className="inline mr-1.5" />
          {t('admin_ui_translations_history', 'History')}
        </button>
      </div>

      {/* ── History view ────────────────────────────────────── */}
      {showHistory ? (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-[var(--border-theme)] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--tx-primary)]">
              {t('admin_ui_translations_change_history', 'Change History')}
            </h2>
            <button onClick={() => setShowHistory(false)} className="text-sm text-[var(--tx-muted)] hover:text-[var(--tx-primary)]">
              <X size={16} className="inline mr-1" />Close
            </button>
          </div>
          <div className="overflow-x-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 size={20} className="animate-spin text-ubuntu-orange" />
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-[var(--tx-muted)]">
                {t('admin_ui_translations_no_history', 'No translation changes recorded yet')}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Language</th>
                    <th className="px-4 py-3">Key</th>
                    <th className="px-4 py-3">Old Value</th>
                    <th className="px-4 py-3">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(entry => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 text-xs text-[var(--tx-dim)] whitespace-nowrap">{formatTime(entry.createdAt)}</td>
                      <td className="px-4 py-3 text-sm">{entry.displayName || entry.username || 'Unknown'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-ubuntu-orange/10 text-ubuntu-orange">{entry.lang.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[var(--tx-dim)]">{entry.key}</td>
                      <td className="px-4 py-3 text-sm text-[var(--tx-muted)] max-w-xs truncate">
                        {entry.oldValue || <span className="italic text-[var(--tx-faint)]">(empty)</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--tx-primary)] max-w-xs truncate">
                        {entry.newValue || <span className="italic text-[var(--tx-faint)]">(empty)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ── Sticky save toolbar ──────────────────────────── */}
          <div className="sticky top-0 z-30 -mx-1 px-1 pt-1 pb-3">
            <div className="glass-card px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-lg">
              {/* Language tabs */}
              <div className="flex gap-1.5 flex-wrap flex-1">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setActiveLang(lang.code)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative ${
                      activeLang === lang.code
                        ? 'bg-ubuntu-orange text-white'
                        : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'
                    }`}
                  >
                    {lang.label}
                    {lang.code !== 'en' && (dirtyCount[lang.code] || 0) > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                        {dirtyCount[lang.code]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Stats & save buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Language summary for active lang */}
                {activeLang !== 'en' && langStats[activeLang] && (
                  <div className="flex items-center gap-2 text-xs text-[var(--tx-dim)]">
                    <span className="text-emerald-400">{langStats[activeLang].translated} translated</span>
                    <span className="text-red-400">{langStats[activeLang].missing} missing</span>
                    {langStats[activeLang].unsaved > 0 && (
                      <span className="text-amber-400">{langStats[activeLang].unsaved} unsaved</span>
                    )}
                  </div>
                )}

                {/* Save buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(activeLang)}
                    disabled={saving || (dirtyCount[activeLang] || 0) === 0}
                    className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                    data-testid="save-lang-btn"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save {activeLang.toUpperCase()}
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={saving || totalDirty === 0}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    data-testid="save-all-btn"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save All
                  </button>
                </div>
              </div>
            </div>

            {/* Save status banner (inside sticky) */}
            {saveStatus && (
              <div className={`mt-2 flex items-center gap-2 p-3 rounded-lg text-sm ${
                saveStatus === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {saveStatus === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {saveMsg}
                <button onClick={() => setSaveStatus(null)} className="ml-auto">
                  <X size={14} className="text-[var(--tx-dim)] hover:text-[var(--tx-primary)]" />
                </button>
              </div>
            )}
          </div>

          {/* ── Search & filters ─────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tx-dim)]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('admin_ui_translations_search', 'Search translation keys or values...')}
                className="input-field w-full pl-10"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterMode(prev => prev === 'unsaved' ? 'all' : 'unsaved')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  filterMode === 'unsaved'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'
                }`}
              >
                <Filter size={14} />
                Unsaved {totalDirty > 0 ? `(${totalDirty})` : ''}
              </button>
              <button
                onClick={() => setShowMissingFilter(prev => !prev)}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                  showMissingFilter
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'
                }`}
              >
                {showMissingFilter ? <EyeOff size={14} /> : <Eye size={14} />}
                Missing
              </button>
            </div>
          </div>

          {/* ── Stats ────────────────────────────────────────── */}
          <div className="flex items-center gap-4 text-sm text-[var(--tx-dim)]">
            <span>{filteredKeys.length} of {allKeys.length} keys</span>
            {totalDirty > 0 && (
              <span className="text-amber-400">{totalDirty} unsaved across all languages</span>
            )}
          </div>

          {/* ── Translation list ─────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 size={24} className="animate-spin text-ubuntu-orange" />
            </div>
          ) : (
            <div ref={listRef} className="space-y-4">
              {Object.entries(groupedKeys).map(([group, keys]) => (
                <div key={group} className="glass-card overflow-hidden">
                  {/* Group header */}
                  <div className="px-4 py-2.5 bg-[var(--surface-table-header)] border-b border-[var(--border-theme)] flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[var(--tx-primary)] uppercase tracking-wider">
                      {group}
                    </h3>
                    <span className="text-xs text-[var(--tx-dim)]">{keys.length} keys</span>
                  </div>

                  {/* Keys */}
                  <div className="divide-y divide-[var(--border-light)]">
                    {keys.map(key => {
                      const savedVal = getSaved(key, activeLang)
                      const draftVal = getDraft(key, activeLang)
                      const isDirty = isKeyDirty(key, activeLang)
                      const isExpanded = expandedKeys.has(key)
                      const isMissing = activeLang !== 'en' && !savedVal
                      const isEn = activeLang === 'en'

                      return (
                        <div key={key} className="hover:bg-[var(--surface-table-row-hover)] transition-colors">
                          {/* Collapsed row */}
                          <div className="px-4 py-2.5 flex items-center gap-3">
                            <button
                              onClick={() => {
                                setExpandedKeys(prev => {
                                  const next = new Set(prev)
                                  if (next.has(key)) next.delete(key)
                                  else next.add(key)
                                  return next
                                })
                              }}
                              className="text-[var(--tx-dim)] hover:text-[var(--tx-primary)]"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <code className="text-xs font-mono text-[var(--tx-muted)] flex-1 truncate min-w-0">
                              {key}
                            </code>
                            {/* Status badge */}
                            {isEn ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-overlay)] text-[var(--tx-dim)] flex-shrink-0">
                                Source
                              </span>
                            ) : isDirty ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 flex-shrink-0">
                                Unsaved
                              </span>
                            ) : savedVal ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                                Saved
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 flex-shrink-0">
                                Missing
                              </span>
                            )}
                            {/* Preview value */}
                            {!isEn && (
                              <span className="text-sm text-[var(--tx-dim)] truncate max-w-[200px] flex-shrink-0">
                                {draftVal || <span className="italic text-[var(--tx-faint)]">(empty)</span>}
                              </span>
                            )}
                          </div>

                          {/* Expanded: source + saved + draft */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 bg-[var(--surface-table-header)]/50 space-y-3">
                              {/* English source (always shown) */}
                              <div>
                                <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                                  <Languages size={10} /> English / Source
                                </label>
                                <div className="input-field w-full text-sm bg-[var(--surface-overlay)] text-[var(--tx-primary)] min-h-[2.5rem] flex items-center">
                                  {getSaved(key, 'en') || <span className="italic text-[var(--tx-faint)]">No source text</span>}
                                </div>
                              </div>

                              {activeLang !== 'en' && (
                                <>
                                  {/* Current saved value */}
                                  <div>
                                    <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                                      Saved {activeLang.toUpperCase()}
                                      {savedVal && (
                                        <span className="text-emerald-400 normal-case ml-1">
                                          (current — {savedVal.length} chars)
                                        </span>
                                      )}
                                    </label>
                                    <div className={`input-field w-full text-sm min-h-[2.5rem] flex items-center ${
                                      savedVal
                                        ? 'bg-emerald-500/5 border-emerald-500/20 text-[var(--tx-primary)]'
                                        : 'bg-[var(--surface-overlay)] text-[var(--tx-faint)] italic'
                                    }`}>
                                      {savedVal || 'No translation yet'}
                                    </div>
                                  </div>

                                  {/* Editable draft */}
                                  <div>
                                    <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                                      Edit draft
                                      {isDirty && (
                                        <span className="text-amber-400 normal-case ml-1">(modified)</span>
                                      )}
                                    </label>
                                    <input
                                      type="text"
                                      value={draftVal}
                                      onChange={e => handleEdit(key, activeLang, e.target.value)}
                                      className={`input-field w-full text-sm ${
                                        isDirty
                                          ? 'bg-amber-400/5 border-amber-400/30 focus:border-ubuntu-orange/50'
                                          : ''
                                      }`}
                                      placeholder={`Translation in ${LANGUAGES.find(l => l.code === activeLang)?.label}`}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {filteredKeys.length === 0 && (
                <div className="text-center py-12 text-[var(--tx-muted)]">
                  {search ? 'No keys match your search' : 'No translation keys found'}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
