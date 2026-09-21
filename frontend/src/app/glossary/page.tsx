'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import { BookOpen, AlertCircle, CheckCircle2, Clock, HelpCircle, Plus, Edit3, Trash2, X, Loader2, Lock, LogIn, LogOut } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import glossaryData from '@/data/glossary.json'

const ITEMS_PER_PAGE = 20

const langColumns = [
  { code: 'en', label: 'English', flag: '🇬🇧', labelKey: 'glossary_english' },
  { code: 'my', label: 'Burmese', flag: '🇲🇲', labelKey: 'glossary_myanmar' },
  { code: 'shn', label: 'Shan', flag: '🇲🇲', labelKey: 'glossary_shan' },
  { code: 'mnw', label: 'Mon', flag: '🇲🇲', labelKey: 'glossary_mon' },
  { code: 'ksw', label: "S'gaw Karen", flag: '🇲🇲', labelKey: 'glossary_karen' },
]

type GlossaryEntry = { id: number; en: string; my: string; shn: string; mnw: string; ksw: string }

function getTranslationStatus(entry: GlossaryEntry): 'translated' | 'partial' | 'pending' {
  const c = [entry.my, entry.shn, entry.mnw, entry.ksw].filter(f => f && f.trim().length > 0).length
  if (c === 4) return 'translated'; if (c > 0) return 'partial'; return 'pending'
}
function getTranslatedCount(entry: GlossaryEntry): number {
  return [entry.my, entry.shn, entry.mnw, entry.ksw].filter(f => f && f.trim().length > 0).length
}

interface GlossaryModalProps {
  entry?: GlossaryEntry | null
  onSave: (data: { en: string; my: string; shn: string; mnw: string; ksw: string }) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

function GlossaryModal({ entry, onSave, onDelete, onClose }: GlossaryModalProps) {
  const { t } = useI18n()
  const [form, setForm] = useState({ en: entry?.en || '', my: entry?.my || '', shn: entry?.shn || '', mnw: entry?.mnw || '', ksw: entry?.ksw || '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (!form.en.trim()) return
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    if (!window.confirm(t('glossary_delete_confirm', 'Are you sure you want to delete this term?'))) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--tx-primary)]">
            {entry ? t('glossary_edit_term', 'Edit Term') : t('glossary_add_term', 'Add Term')}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-overlay)] text-[var(--tx-muted)]"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          {langColumns.map(col => (
            <div key={col.code}>
              <label className="text-xs text-[var(--tx-dim)] mb-1 block">{col.flag} {t(col.labelKey, col.label)}</label>
              <input
                type="text"
                value={form[col.code as keyof typeof form]}
                onChange={e => setForm({ ...form, [col.code]: e.target.value })}
                placeholder={col.code === 'en' ? t('glossary_english_placeholder', 'English term (required)') : ''}
                className="input-field w-full"
                disabled={col.code === 'en' && !!entry}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {entry && onDelete && (
              <button onClick={handleDelete} disabled={deleting} className="btn-ghost text-sm text-red-400 hover:text-red-300 flex items-center gap-1.5">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {t('glossary_delete', 'Delete')}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-sm">{t('glossary_cancel', 'Cancel')}</button>
            <button onClick={handleSave} disabled={saving || !form.en.trim()} className="btn-primary text-sm flex items-center gap-1.5">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {entry ? t('glossary_save', 'Save') : t('glossary_add', 'Add')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GlossaryPage() {
  const { t } = useI18n()
  const { user, glossaryLogin, glossaryLogout } = useAuth()
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLang, setSelectedLang] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // DB glossary entries (for authenticated users)
  const [dbEntries, setDbEntries] = useState<GlossaryEntry[]>([])
  const [dbLoading, setDbLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<GlossaryEntry | null>(null)

  // Glossary admin login state
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [authRequired, setAuthRequired] = useState<boolean | null>(null)

  // Check if auth is required on mount
  useEffect(() => {
    fetch('/api/glossary/auth')
      .then(r => r.json())
      .then(d => setAuthRequired(d.authRequired))
      .catch(() => setAuthRequired(false))
  }, [])

  /** Get Bearer token from localStorage */
  const getAuthToken = useCallback((): string | null => {
    try {
      const stored = localStorage.getItem('ubuntu-localization-glossary-auth')
      if (stored) {
        const data = JSON.parse(stored)
        return data?.password || null
      }
    } catch {}
    return null
  }, [])

  /** Build auth headers for write requests */
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getAuthToken()
    if (!token) return { 'Content-Type': 'application/json' }
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  }, [getAuthToken])

  const handleLogin = async () => {
    if (!loginPassword.trim()) return
    setLoginLoading(true)
    setLoginError(null)
    const ok = await glossaryLogin(loginPassword)
    setLoginLoading(false)
    if (!ok) setLoginError(t('glossary_login_error', 'Invalid password'))
    else { setLoginPassword(''); setLoginError(null) }
  }

  const handleLogout = () => {
    glossaryLogout()
    setDbEntries([])
  }

  const isAdmin = user !== null || authRequired === false

  // Load DB glossary when authenticated or when no auth is required
  const loadDbGlossary = useCallback(async () => {
    setDbLoading(true)
    try {
      const res = await fetch('/api/glossary')
      if (res.ok) {
        const data = await res.json()
        setDbEntries(data.entries || [])
      }
    } catch {
      // Ignore errors
    } finally {
      setDbLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadDbGlossary()
    }
  }, [isAdmin, loadDbGlossary])

  // Combine static + DB entries
  const allEntries = useMemo(() => {
    const staticEntries = glossaryData.entries as GlossaryEntry[]
    if (!isAdmin || dbEntries.length === 0) return staticEntries
    return dbEntries
  }, [dbEntries, isAdmin])

  const filtered = useMemo(() => {
    let result = allEntries
    if (search) {
      const q = search.toLowerCase()
      if (selectedLang) {
        result = result.filter(e => String(e[selectedLang as keyof GlossaryEntry] || '').toLowerCase().includes(q))
      } else {
        result = result.filter(e => e.en.toLowerCase().includes(q) || e.my.toLowerCase().includes(q) || e.shn.toLowerCase().includes(q) || e.mnw.toLowerCase().includes(q) || e.ksw.toLowerCase().includes(q))
      }
    }
    if (statusFilter) result = result.filter(e => getTranslationStatus(e) === statusFilter)
    return result
  }, [search, statusFilter, selectedLang, allEntries])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const totalTranslated = allEntries.filter(e => getTranslationStatus(e) === 'translated').length
  const totalPartial = allEntries.filter(e => getTranslationStatus(e) === 'partial').length
  const totalPending = allEntries.filter(e => getTranslationStatus(e) === 'pending').length

  const handleAdd = async (data: { en: string; my: string; shn: string; mnw: string; ksw: string }) => {
    const res = await fetch('/api/glossary', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to add term')
    }
    await loadDbGlossary()
  }

  const handleUpdate = async (data: { en: string; my: string; shn: string; mnw: string; ksw: string }) => {
    if (!editingEntry) return
    const res = await fetch('/api/glossary', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id: editingEntry.id, ...data }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to update term')
    }
    await loadDbGlossary()
  }

  const handleDelete = async () => {
    if (!editingEntry) return
    const res = await fetch(`/api/glossary?id=${editingEntry.id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to delete term')
    }
    await loadDbGlossary()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('glossary_title', 'Glossary')}</h1>
          <p className="text-[var(--tx-muted)] mt-1">{t('glossary_subtitle', 'Standardized terminology for consistent translations')}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button onClick={() => { setEditingEntry(null); setShowModal(true) }} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} />{t('glossary_add_term', 'Add Term')}
            </button>
          )}
          <span className="text-sm text-[var(--tx-dim)]">{allEntries.length} {t('glossary_terms', 'terms')}</span>
        </div>
      </div>

      {/* Glossary Admin Login */}
      {authRequired === true && !user && (
        <div className="glass-card p-4 border-l-4 border-ubuntu-orange/50">
          <div className="flex items-center gap-3">
            <Lock className="text-ubuntu-orange flex-shrink-0" size={18} />
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <p className="text-sm text-[var(--tx-muted)] flex items-center gap-2">
                {t('glossary_admin_login', 'Admin login to edit glossary')}
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                  placeholder={t('glossary_password', 'Password')}
                  className="input-field text-sm px-3 py-1.5 w-48"
                />
                <button onClick={handleLogin} disabled={loginLoading || !loginPassword.trim()} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5">
                  {loginLoading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                  {t('glossary_login', 'Login')}
                </button>
              </div>
              {loginError && <p className="text-xs text-red-400 mt-1">{loginError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Logged-in admin bar */}
      {(user || authRequired === false) && (
        <div className="glass-card p-3 border-l-4 border-emerald-500/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={14} />
              {t('glossary_admin_active', 'Admin mode active — you can edit glossary entries')}
            </span>
            {user && (
              <button onClick={handleLogout} className="btn-ghost text-xs text-[var(--tx-muted)] hover:text-[var(--tx-primary)] flex items-center gap-1">
                <LogOut size={12} />
                {t('glossary_logout', 'Logout')}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="glass-card p-4 border-l-4 border-amber-500/50">
        <div className="flex gap-3">
          <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm text-[var(--tx-secondary)] font-medium">{t('glossary_personal_note', 'Personal Note')}</p>
            <p className="text-xs text-[var(--tx-muted)] mt-0.5">{t('glossary_disclaimer', 'These are unofficial personal notes. Contributions are welcome via GitHub.')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[{ key: 'translated', icon: CheckCircle2, color: 'text-emerald-400', ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10', count: totalTranslated, label: t('glossary_fully_translated', 'Fully Translated') },
          { key: 'partial', icon: Clock, color: 'text-amber-400', ring: 'ring-amber-500/30', bg: 'bg-amber-500/10', count: totalPartial, label: t('glossary_partial', 'Partial') },
          { key: 'pending', icon: HelpCircle, color: 'text-[var(--tx-dim)]', ring: 'ring-white/20', bg: 'bg-[var(--surface-overlay)]', count: totalPending, label: t('glossary_pending', 'Pending') }].map(stat => (
          <button key={stat.key} onClick={() => setStatusFilter(statusFilter === stat.key ? null : stat.key)}
            className={`glass-card p-3 text-center transition-all duration-200 ${statusFilter === stat.key ? `ring-2 ${stat.ring}` : 'hover:bg-[var(--surface-card-hover)]'}`}>
            <div className="flex items-center justify-center gap-2">
              <stat.icon size={16} className={stat.color} />
              <span className={`text-lg font-bold ${stat.color}`}>{stat.count}</span>
            </div>
            <p className="text-[10px] text-[var(--tx-dim)] mt-1">{stat.label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setCurrentPage(1) }} placeholder={t('glossary_search', 'Search glossary terms...')} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setSelectedLang(null); setCurrentPage(1) }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedLang === null ? 'bg-ubuntu-orange text-white shadow-lg shadow-ubuntu-orange/20' : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'}`}>
            {t('glossary_all', 'All')}
          </button>
          {langColumns.slice(1).map(lang => (
            <button key={lang.code} onClick={() => { setSelectedLang(selectedLang === lang.code ? null : lang.code); setCurrentPage(1) }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedLang === lang.code ? 'bg-ubuntu-orange text-white shadow-lg shadow-ubuntu-orange/20' : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'}`}>
              {lang.flag} {t(lang.labelKey, lang.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="glass-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                {langColumns.map(lang => (
                  <th key={lang.code} className={selectedLang && selectedLang !== lang.code ? 'hidden' : ''}>{lang.flag} {t(lang.labelKey, lang.label)}</th>
                ))}
                <th className="w-24">{t('glossary_status', 'Status')}</th>
                {isAdmin && <th className="w-20">{t('glossary_actions', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {paginated.map(entry => {
                const s = getTranslationStatus(entry); const c = getTranslatedCount(entry)
                return (
                  <tr key={entry.id}>
                    <td data-label={t('glossary_english', 'English')} className="font-medium text-[var(--tx-primary)]">{entry.en}</td>
                    <td data-label={t('glossary_myanmar', 'Burmese')} className={`font-myanmar ${selectedLang && selectedLang !== 'my' ? 'hidden' : ''}`}>{entry.my || <span className="text-[var(--tx-faint)]">—</span>}</td>
                    <td data-label={t('glossary_shan', 'Shan')} className={`font-myanmar ${selectedLang && selectedLang !== 'shn' ? 'hidden' : ''}`}>{entry.shn || <span className="text-[var(--tx-faint)] italic">—</span>}</td>
                    <td data-label={t('glossary_mon', 'Mon')} className={`font-myanmar ${selectedLang && selectedLang !== 'mnw' ? 'hidden' : ''}`}>{entry.mnw || <span className="text-[var(--tx-faint)] italic">—</span>}</td>
                    <td data-label={t('glossary_karen', "S'gaw Karen")} className={`font-myanmar ${selectedLang && selectedLang !== 'ksw' ? 'hidden' : ''}`}>{entry.ksw || <span className="text-[var(--tx-faint)] italic">—</span>}</td>
                    <td data-label={t('glossary_status', 'Status')}>
                      {s === 'translated' && <span className="status-translated"><CheckCircle2 size={10} className="mr-1" />{t('glossary_full', 'Full')}</span>}
                      {s === 'partial' && <span className="status-partial"><Clock size={10} className="mr-1" />{c}/4</span>}
                      {s === 'pending' && <span className="status-pending">{t('glossary_pending', 'Pending')}</span>}
                    </td>
                    {isAdmin && (
                      <td data-label={t('glossary_actions', 'Actions')}>
                        <button onClick={() => { setEditingEntry(entry); setShowModal(true) }}
                          className="p-1.5 rounded-lg hover:bg-[var(--surface-overlay)] text-[var(--tx-dim)] hover:text-[var(--tx-primary)] transition-colors">
                          <Edit3 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginated.map(entry => {
          const s = getTranslationStatus(entry); const c = getTranslatedCount(entry)
          return (
            <div key={entry.id} className="glass-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <p className="font-medium text-[var(--tx-primary)] text-sm">{entry.en}</p>
                <div className="flex items-center gap-2">
                  {s === 'translated' && <span className="status-translated"><CheckCircle2 size={10} className="mr-1" />{t('glossary_full', 'Full')}</span>}
                  {s === 'partial' && <span className="status-partial"><Clock size={10} className="mr-1" />{c}/4</span>}
                  {s === 'pending' && <span className="status-pending">{t('glossary_pending', 'Pending')}</span>}
                  {isAdmin && (
                    <button onClick={() => { setEditingEntry(entry); setShowModal(true) }}
                      className="p-1 rounded-lg hover:bg-[var(--surface-overlay)] text-[var(--tx-dim)]">
                      <Edit3 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className={`grid gap-2 ${selectedLang ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {[{ code: 'my', label: t('glossary_myanmar', 'Burmese'), value: entry.my }, { code: 'shn', label: t('glossary_shan', 'Shan'), value: entry.shn }, { code: 'mnw', label: t('glossary_mon', 'Mon'), value: entry.mnw }, { code: 'ksw', label: t('glossary_karen', 'Karen'), value: entry.ksw }].filter(l => !selectedLang || l.code === selectedLang).map(l => (
                  <div key={l.code} className="text-xs">
                    <span className="text-[var(--tx-dim)]">{l.label}: </span>
                    {l.value ? <span className="font-myanmar text-[var(--tx-secondary)]">{l.value}</span> : <span className="text-[var(--tx-faint)] italic">—</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto text-[var(--tx-faint)] mb-4" size={48} />
          <p className="text-[var(--tx-muted)] text-lg font-medium">{t('glossary_no_results', 'No terms match your search')}</p>
          <p className="text-[var(--tx-dim)] text-sm mt-1">{t('glossary_no_results_hint', 'Try a different search term or clear filters')}</p>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {showModal && (
        <GlossaryModal
          entry={editingEntry}
          onSave={editingEntry ? handleUpdate : handleAdd}
          onDelete={editingEntry ? handleDelete : undefined}
          onClose={() => { setShowModal(false); setEditingEntry(null) }}
        />
      )}
    </div>
  )
}
