'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Settings, Save, Loader2, Search, Clock, ArrowLeft, AlertCircle, CheckCircle2, X, Edit3, ChevronDown, ChevronUp } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type LanguageCode = 'en' | 'my' | 'shn' | 'mnw' | 'ksw'

interface TranslationRow {
  key: string
  en: string
  my: string
  shn: string
  mnw: string
  ksw: string
}

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

const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'my', label: 'Burmese', native: 'ဗမာ' },
  { code: 'shn', label: 'Shan', native: 'ရှမ်း' },
  { code: 'mnw', label: 'Mon', native: 'မွန်' },
  { code: 'ksw', label: "S'gaw Karen", native: 'စကောကရင်' },
]

/**
 * Safely parse a fetch Response as JSON.
 * Returns null if the body is empty, non-JSON, or malformed.
 */
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

export default function UiTranslationsPage() {
  const { t } = useI18n()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Data state
  const [allKeys, setAllKeys] = useState<string[]>([])
  const [staticKeys, setStaticKeys] = useState<string[]>([])
  const [dbKeys, setDbKeys] = useState<string[]>([])
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({})
  const [editing, setEditing] = useState<Record<string, Record<string, string>>>({})
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null)
  const [saveMsg, setSaveMsg] = useState('')

  // UI state
  const [search, setSearch] = useState('')
  const [activeLang, setActiveLang] = useState<LanguageCode>('en')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<TranslationHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  // Load translations
  const loadTranslations = useCallback(async () => {
    try {
      // Fetch static JSON keys (source of truth for all available keys)
      const staticRes = await fetch('/api/admin/ui-translations')
      if (!staticRes.ok) throw new Error('Failed to fetch')
      const staticData = await safeJson(staticRes)
      const dbTranslations = (staticData && typeof staticData.translations === 'object' ? staticData.translations : {}) as Record<string, Record<string, string>>
      const dbKeysList = Array.isArray(staticData?.keys) ? staticData.keys as string[] : []

      // Get all keys from static JSON imports
      const enJson: Record<string, string> = (await import('@/data/i18n/en.json')).default
      const allStaticKeys = Object.keys(enJson).sort()

      // Merge: static keys + any DB-only keys
      const merged = new Set([...allStaticKeys, ...dbKeysList])
      const sorted = Array.from(merged).sort()

      setStaticKeys(allStaticKeys)
      setDbKeys(dbKeysList)
      setAllKeys(sorted)

      // Build translation rows
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

  // Load history
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

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
    if (!authLoading && user && !user.isAdmin) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Load data on mount
  useEffect(() => {
    if (user?.isAdmin) {
      loadTranslations()
    }
  }, [user, loadTranslations])

  // Load history when shown
  useEffect(() => {
    if (showHistory) {
      loadHistory()
    }
  }, [showHistory, loadHistory])

  // Handle edit
  const handleEdit = useCallback((key: string, lang: LanguageCode, value: string) => {
    setEditing(prev => ({
      ...prev,
      [key]: { ...prev[key], [lang]: value },
    }))
    setDirtyKeys(prev => new Set(prev).add(key))
  }, [])

  // Check if a value is an admin override (exists in DB)
  const isDbOverride = useCallback((key: string, lang: LanguageCode) => {
    if (lang === 'en') return false
    return dbKeys.includes(key) && !!translations[key]?.[lang]
  }, [dbKeys, translations])

  // Save changes
  const handleSave = useCallback(async (lang: LanguageCode) => {
    setSaving(true)
    setSaveStatus(null)
    try {
      const changed: Record<string, string> = {}
      for (const key of dirtyKeys) {
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

      // Reload translations
      await loadTranslations()
      setDirtyKeys(new Set())
      setSaveStatus('success')
      setSaveMsg(`Saved ${Object.keys(changed).length} translation(s) for ${lang.toUpperCase()}`)
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (err: any) {
      setSaveStatus('error')
      setSaveMsg(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [dirtyKeys, editing, translations, loadTranslations])

  // Save all languages
  const handleSaveAll = useCallback(async () => {
    setSaving(true)
    setSaveStatus(null)
    let totalSaved = 0
    try {
      for (const lang of ['en', 'my', 'shn', 'mnw', 'ksw'] as LanguageCode[]) {
        const changed: Record<string, string> = {}
        for (const key of dirtyKeys) {
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
          }
        }
      }
      await loadTranslations()
      setDirtyKeys(new Set())
      setSaveStatus('success')
      setSaveMsg(`Saved ${totalSaved} translation(s) across all languages`)
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (err: any) {
      setSaveStatus('error')
      setSaveMsg(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [dirtyKeys, editing, translations, loadTranslations])

  // Filter keys
  const filteredKeys = useMemo(() => {
    if (!search.trim()) return allKeys
    const q = search.toLowerCase()
    return allKeys.filter(key => {
      if (key.toLowerCase().includes(q)) return true
      const row = editing[key]
      if (!row) return false
      return Object.values(row).some(v => v.toLowerCase().includes(q))
    })
  }, [allKeys, search, editing])

  // Group keys by prefix
  const groupedKeys = useMemo(() => {
    const groups: Record<string, string[]> = {}
    for (const key of filteredKeys) {
      const prefix = key.split('_')[0] || 'other'
      if (!groups[prefix]) groups[prefix] = []
      groups[prefix].push(key)
    }
    return groups
  }, [filteredKeys])

  // Count dirty keys per language
  const dirtyCount = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const key of dirtyKeys) {
      for (const lang of ['en', 'my', 'shn', 'mnw', 'ksw']) {
        const newVal = editing[key]?.[lang] || ''
        const oldVal = translations[key]?.[lang] || ''
        if (newVal !== oldVal) {
          counts[lang] = (counts[lang] || 0) + 1
        }
      }
    }
    return counts
  }, [dirtyKeys, editing, translations])

  // Auth loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-ubuntu-orange" />
      </div>
    )
  }

  // Not admin
  if (!user || !user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle size={48} className="text-red-400" />
        <p className="text-[var(--tx-muted)]">Admin access required</p>
        <Link href="/" className="btn-primary">Go to Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="max-w-full space-y-6">
      {/* Header */}
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showHistory
                ? 'bg-ubuntu-orange/20 text-ubuntu-orange'
                : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'
            }`}
          >
            <Clock size={16} className="inline mr-1.5" />
            {t('admin_ui_translations_history', 'History')}
          </button>
        </div>
      </div>

      {/* Save status */}
      {saveStatus && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          saveStatus === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {saveStatus === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {saveMsg}
        </div>
      )}

      {/* History view */}
      {showHistory ? (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-[var(--border-theme)] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--tx-primary)]">
              {t('admin_ui_translations_change_history', 'Change History')}
            </h2>
            <button
              onClick={() => setShowHistory(false)}
              className="text-sm text-[var(--tx-muted)] hover:text-[var(--tx-primary)]"
            >
              <X size={16} className="inline mr-1" />
              Close
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
                      <td className="px-4 py-3 text-xs text-[var(--tx-dim)] whitespace-nowrap">
                        {formatTime(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {entry.displayName || entry.username || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-ubuntu-orange/10 text-ubuntu-orange">
                          {entry.lang.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[var(--tx-dim)]">
                        {entry.key}
                      </td>
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
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
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

            {/* Language tabs */}
            <div className="flex gap-1.5">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setActiveLang(lang.code)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                    activeLang === lang.code
                      ? 'bg-ubuntu-orange text-white'
                      : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'
                  }`}
                >
                  {lang.label}
                  {(dirtyCount[lang.code] || 0) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                      {dirtyCount[lang.code]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Save buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleSave(activeLang)}
                disabled={saving || (dirtyCount[activeLang] || 0) === 0}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save {activeLang.toUpperCase()}
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving || dirtyKeys.size === 0}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save All
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-[var(--tx-dim)]">
            <span>{filteredKeys.length} of {allKeys.length} keys</span>
            {dirtyKeys.size > 0 && (
              <span className="text-amber-400">{dirtyKeys.size} modified</span>
            )}
          </div>

          {/* Translation grid */}
          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 size={24} className="animate-spin text-ubuntu-orange" />
            </div>
          ) : (
            <div className="space-y-4">
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
                    {keys.map(key => (
                      <div key={key} className="hover:bg-[var(--surface-table-row-hover)] transition-colors">
                        {/* Key row - always visible */}
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
                            {expandedKeys.has(key) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <code className="text-xs font-mono text-[var(--tx-muted)] flex-1 truncate">
                            {key}
                          </code>
                          {dirtyKeys.has(key) && (
                            <span className="w-2 h-2 rounded-full bg-amber-400" title="Modified" />
                          )}
                          {/* Show the active language's value as preview */}
                          <span className="text-sm text-[var(--tx-dim)] truncate max-w-[200px]">
                            {editing[key]?.[activeLang] || <span className="italic text-[var(--tx-faint)]">(empty)</span>}
                          </span>
                        </div>

                        {/* Expanded: all languages */}
                        {expandedKeys.has(key) && (
                          <div className="px-4 pb-3 pt-1 bg-[var(--surface-table-header)]/50">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                              {LANGUAGES.map(lang => (
                                <div key={lang.code}>
                                  <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 block">
                                    {lang.label} ({lang.code})
                                  </label>
                                  <input
                                    type="text"
                                    value={editing[key]?.[lang.code] || ''}
                                    onChange={e => handleEdit(key, lang.code, e.target.value)}
                                    readOnly={lang.code === 'en'}
                                    className={`input-field w-full text-sm ${
                                      lang.code === 'en'
                                        ? 'bg-[var(--surface-overlay)] cursor-not-allowed opacity-60'
                                        : ''
                                    }`}
                                    placeholder={lang.code === 'en' ? 'Source text (read-only)' : `Translation in ${lang.label}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
