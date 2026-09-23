'use client'

import { useState, useEffect, useCallback } from 'react'
import { History, Clock, Plus, Edit3, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

interface GlossaryHistoryEntry {
  id: number
  userId: number | null
  glossaryId: number | null
  action: 'add' | 'update' | 'delete'
  oldValues: Record<string, any> | null
  newValues: Record<string, any> | null
  termEn: string | null
  username: string | null
  displayName: string | null
  createdAt: number
}

const actionConfig: Record<string, { icon: typeof Plus; color: string; bg: string }> = {
  add: { icon: Plus, color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
  update: { icon: Edit3, color: 'text-amber-400', bg: 'bg-amber-400/20' },
  delete: { icon: Trash2, color: 'text-red-400', bg: 'bg-red-400/20' },
}

function formatTime(timestamp: number, t: (key: string, fallback?: string) => string): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return t('history_time_just_now', 'Just now')
  if (mins < 60) return `${mins}${t('history_time_minutes_ago', 'm ago')}`
  if (hours < 24) return `${hours}${t('history_time_hours_ago', 'h ago')}`
  if (days < 7) return `${days}${t('history_time_days_ago', 'd ago')}`

  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function GlossaryHistoryPage() {
  const { t } = useI18n()
  const { user, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<GlossaryHistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const limit = 20

  const loadHistory = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await fetch(`/api/glossary/history?limit=${limit}&offset=${page * limit}`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        setTotal(data.total || 0)
      }
    } catch {
      // Ignore errors
    } finally {
      setLoading(false)
    }
  }, [user, page])

  useEffect(() => {
    if (!authLoading) {
      loadHistory()
    }
  }, [authLoading, loadHistory])

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-ubuntu-orange" size={32} />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center py-12">
          <History className="mx-auto text-[var(--tx-faint)] mb-4" size={48} />
          <p className="text-[var(--tx-muted)] text-lg font-medium">{t('auth_login_required', 'Sign in to view glossary history')}</p>
          <Link href="/glossary" className="btn-primary mt-4 inline-flex items-center gap-2">
            <ArrowLeft size={16} />{t('glossary_back', 'Back to Glossary')}
          </Link>
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/glossary" className="text-[var(--tx-muted)] hover:text-[var(--tx-primary)] transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('glossary_history', 'Glossary History')}</h1>
              <p className="text-[var(--tx-muted)] mt-1">
                {user.isAdmin ? t('glossary_history_all', 'All glossary changes') : t('glossary_history_yours', 'Your glossary changes')} — {total} {t('history_entries', 'entries')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Timeline */}
      <div className="hidden md:block relative">
        <div className="absolute left-8 top-0 bottom-0 w-px bg-[var(--border-theme)]" />
        <div className="space-y-6">
          {entries.map(entry => {
            const config = actionConfig[entry.action] || actionConfig.update
            const Icon = config.icon
            return (
              <div key={entry.id} className="timeline-item">
                <div className={`timeline-icon ${config.bg}`}>
                  <Icon size={24} className={config.color} />
                </div>
                <div className="timeline-content glass-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[var(--tx-primary)] font-medium">
                        {entry.action === 'add' && t('glossary_history_added', 'Added term')}
                        {entry.action === 'update' && t('glossary_history_updated', 'Updated term')}
                        {entry.action === 'delete' && t('glossary_history_deleted', 'Deleted term')}
                        {entry.termEn && <span className="text-ubuntu-orange ml-2">&ldquo;{entry.termEn}&rdquo;</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {entry.username && (
                          <span className="text-sm text-[var(--tx-muted)]">
                            {t('glossary_history_by', 'by')} @{entry.username}
                          </span>
                        )}
                        {user.isAdmin && entry.displayName && (
                          <span className="badge-orange">{entry.displayName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--tx-dim)] flex-shrink-0 ml-4">
                      <Clock size={12} />
                      {formatTime(entry.createdAt, t)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {entries.map(entry => {
          const config = actionConfig[entry.action] || actionConfig.update
          const Icon = config.icon
          return (
            <div key={entry.id} className="glass-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon size={18} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--tx-primary)] font-medium text-sm">
                    {entry.action === 'add' && t('glossary_history_added', 'Added term')}
                    {entry.action === 'update' && t('glossary_history_updated', 'Updated term')}
                    {entry.action === 'delete' && t('glossary_history_deleted', 'Deleted term')}
                    {entry.termEn && <span className="text-ubuntu-orange ml-1">&ldquo;{entry.termEn}&rdquo;</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {entry.username && (
                      <span className="text-xs text-[var(--tx-dim)]">@{entry.username}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--tx-dim)]">
                <span />
                <span className="flex items-center gap-1 flex-shrink-0">
                  <Clock size={10} />
                  {formatTime(entry.createdAt, t)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {entries.length === 0 && !loading && (
        <div className="text-center py-12">
          <History className="mx-auto text-[var(--tx-faint)] mb-4" size={48} />
          <p className="text-[var(--tx-muted)] text-lg font-medium">{t('glossary_history_empty', 'No glossary changes recorded yet')}</p>
          <p className="text-[var(--tx-dim)] text-sm mt-1">{t('glossary_history_empty_hint', 'Changes will appear here after you edit glossary terms')}</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-ghost text-sm disabled:opacity-50"
          >
            {t('pagination_prev', 'Previous')}
          </button>
          <span className="text-sm text-[var(--tx-muted)] py-2">
            {t('pagination_page', 'Page')} {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn-ghost text-sm disabled:opacity-50"
          >
            {t('pagination_next', 'Next')}
          </button>
        </div>
      )}
    </div>
  )
}
