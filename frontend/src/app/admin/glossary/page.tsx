'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, X, Eye } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Suggestion = {
  id: number
  submittedBy: number | null
  action: string
  glossaryId: number | null
  en: string
  my: string
  shn: string
  mnw: string
  ksw: string
  note: string
  status: string
  reviewedBy: number | null
  reviewedAt: string | null
  reviewNote: string
  createdAt: string
  submitterUsername: string | null
  submitterDisplayName: string | null
  reviewerUsername: string | null
  reviewerDisplayName: string | null
}

type FilterStatus = 'pending' | 'approved' | 'rejected' | ''

function formatTime(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function AdminGlossaryPage() {
  const { t } = useI18n()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [showNoteModal, setShowNoteModal] = useState<{ id: number; action: 'approved' | 'rejected' } | null>(null)

  const loadSuggestions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100', offset: '0' })
      if (filter) params.set('status', filter)
      const res = await fetch(`/api/glossary/suggestions?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.entries || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadSuggestions() }, [loadSuggestions])

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) router.push('/')
  }, [user, authLoading, router])

  const handleReview = async (id: number, status: 'approved' | 'rejected', note?: string) => {
    setActionLoading(id)
    try {
      const res = await fetch('/api/glossary/suggestions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, status, reviewNote: note || '' }),
      })
      if (res.ok) {
        await loadSuggestions()
      }
    } catch {} finally {
      setActionLoading(null)
      setShowNoteModal(null)
      setReviewNote('')
    }
  }

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

  const pendingCount = suggestions.filter(s => s.status === 'pending').length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-ubuntu-orange/20">
            <BookOpen size={24} className="text-ubuntu-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--tx-primary)]">
              {t('admin_glossary_title', 'Glossary Moderation')}
            </h1>
            <p className="text-sm text-[var(--tx-muted)]">
              {t('admin_glossary_subtitle', 'Review and approve glossary suggestions')}
            </p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { value: 'pending' as const, label: 'Pending', icon: Clock, color: 'text-amber-400' },
          { value: 'approved' as const, label: 'Approved', icon: CheckCircle2, color: 'text-emerald-400' },
          { value: 'rejected' as const, label: 'Rejected', icon: XCircle, color: 'text-red-400' },
          { value: '' as const, label: 'All', icon: Eye, color: 'text-[var(--tx-dim)]' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              filter === tab.value
                ? 'bg-ubuntu-orange/20 text-ubuntu-orange border border-ubuntu-orange/30'
                : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'
            }`}
          >
            <tab.icon size={14} className={tab.color} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Suggestions list */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 size={24} className="animate-spin text-ubuntu-orange" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12 text-[var(--tx-muted)]">
          <BookOpen className="mx-auto mb-4 text-[var(--tx-faint)]" size={48} />
          <p>No suggestions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => (
            <div key={s.id} className={`glass-card overflow-hidden transition-all ${
              s.status === 'pending' ? 'border-l-4 border-l-amber-400/50' :
              s.status === 'approved' ? 'border-l-4 border-l-emerald-500/50' :
              'border-l-4 border-l-red-500/50'
            }`}>
              {/* Summary row */}
              <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-table-row-hover)]"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-[var(--tx-primary)]">{s.en}</code>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      s.status === 'pending' ? 'bg-amber-400/20 text-amber-400' :
                      s.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {s.status}
                    </span>
                    <span className="text-[10px] text-[var(--tx-faint)] px-1.5 py-0.5 rounded bg-[var(--surface-overlay)]">
                      {s.action}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--tx-dim)] mt-0.5">
                    by {s.submitterDisplayName || s.submitterUsername || 'Unknown'} · {formatTime(s.createdAt)}
                  </p>
                </div>

                {/* Action buttons for pending */}
                {s.status === 'pending' && (
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setShowNoteModal({ id: s.id, action: 'approved' })}
                      disabled={actionLoading === s.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Approve
                    </button>
                    <button
                      onClick={() => setShowNoteModal({ id: s.id, action: 'rejected' })}
                      disabled={actionLoading === s.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {expandedId === s.id && (
                <div className="px-4 pb-4 pt-2 bg-[var(--surface-table-header)]/50 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                      { code: 'en', label: 'English', value: s.en },
                      { code: 'my', label: 'Burmese', value: s.my },
                      { code: 'shn', label: 'Shan', value: s.shn },
                      { code: 'mnw', label: 'Mon', value: s.mnw },
                      { code: 'ksw', label: "S'gaw Karen", value: s.ksw },
                    ].map(col => (
                      <div key={col.code}>
                        <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 block">
                          {col.label}
                        </label>
                        <div className="input-field w-full text-sm bg-[var(--surface-overlay)] min-h-[2rem] flex items-center">
                          {col.value || <span className="italic text-[var(--tx-faint)]">—</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {s.note && (
                    <div>
                      <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 block">Note</label>
                      <p className="text-sm text-[var(--tx-secondary)]">{s.note}</p>
                    </div>
                  )}

                  {s.reviewNote && (
                    <div>
                      <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 block">Review Note</label>
                      <p className="text-sm text-[var(--tx-secondary)]">{s.reviewNote}</p>
                    </div>
                  )}

                  {s.reviewerUsername && (
                    <p className="text-xs text-[var(--tx-dim)]">
                      Reviewed by {s.reviewerDisplayName || s.reviewerUsername} · {formatTime(s.reviewedAt!)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review note modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowNoteModal(null); setReviewNote('') }}>
          <div className="glass-card p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--tx-primary)]">
              {showNoteModal.action === 'approved' ? 'Approve Suggestion' : 'Reject Suggestion'}
            </h3>
            <div>
              <label className="text-xs text-[var(--tx-dim)] mb-1 block">Review note (optional)</label>
              <input
                type="text"
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder="Add a note about this decision..."
                className="input-field w-full"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowNoteModal(null); setReviewNote('') }} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={() => handleReview(showNoteModal.id, showNoteModal.action, reviewNote)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  showNoteModal.action === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {showNoteModal.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
