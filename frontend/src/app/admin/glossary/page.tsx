'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, X, Eye, Pencil, Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getReviewHistory, addReviewHistory, clearReviewHistory, type ReviewHistoryEntry } from '@/lib/review-history'

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

type NoteModalState = {
  id: number
  action: 'approved' | 'rejected'
  label: string
}

type EditModalState = {
  id: number
  en: string
  my: string
  shn: string
  mnw: string
  ksw: string
  note: string
}

function formatTime(ts: string | number | null | undefined): string {
  if (ts === null || ts === undefined || ts === '') return 'Unknown date'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return 'Unknown date'
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatReviewTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function statusDisplay(status: string): { label: string; className: string } {
  switch (status) {
    case 'pending': return { label: 'Pending Review', className: 'bg-amber-400/20 text-amber-400' }
    case 'approved': return { label: 'Approved', className: 'bg-emerald-500/20 text-emerald-400' }
    case 'rejected': return { label: 'Rejected', className: 'bg-red-500/20 text-red-400' }
    default: return { label: status, className: 'bg-[var(--surface-overlay)] text-[var(--tx-dim)]' }
  }
}

function actionDisplay(action: string): string {
  switch (action) {
    case 'add': return 'Add'
    case 'update': return 'Edit'
    case 'delete': return 'Delete'
    default: return action
  }
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
  const [showNoteModal, setShowNoteModal] = useState<NoteModalState | null>(null)
  const [showEditModal, setShowEditModal] = useState<EditModalState | null>(null)
  const [view, setView] = useState<'pending' | 'history'>('pending')
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryEntry[]>([])

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

  const loadReviewHistory = useCallback(() => {
    setReviewHistory(getReviewHistory())
  }, [])

  useEffect(() => { loadSuggestions() }, [loadSuggestions])
  useEffect(() => { loadReviewHistory() }, [loadReviewHistory])

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
        const suggestion = suggestions.find(s => s.id === id)
        if (suggestion) {
          addReviewHistory({
            termEn: suggestion.en,
            action: status,
            reviewerNote: note || undefined,
          })
        }
        await loadSuggestions()
        loadReviewHistory()
      }
    } catch {} finally {
      setActionLoading(null)
      setShowNoteModal(null)
      setReviewNote('')
    }
  }

  const handleEditAndApprove = async (id: number, data: EditModalState) => {
    setActionLoading(id)
    try {
      // First, edit the suggestion fields
      const editRes = await fetch('/api/glossary/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, en: data.en, my: data.my, shn: data.shn, mnw: data.mnw, ksw: data.ksw, note: data.note }),
      })
      if (!editRes.ok) return

      // Then approve it
      const approveRes = await fetch('/api/glossary/suggestions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, status: 'approved', reviewNote: 'Approved after edit' }),
      })
      if (approveRes.ok) {
        addReviewHistory({
          termEn: data.en,
          action: 'approved',
          reviewerNote: 'Approved after edit',
        })
        await loadSuggestions()
        loadReviewHistory()
      }
    } catch {} finally {
      setActionLoading(null)
      setShowEditModal(null)
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

  function getActionButtons(s: Suggestion) {
    if (s.status !== 'pending') return null

    if (s.action === 'delete') {
      return (
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowNoteModal({ id: s.id, action: 'approved', label: 'Approve Delete' })}
            disabled={actionLoading === s.id}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Approve Delete
          </button>
          <button
            onClick={() => setShowNoteModal({ id: s.id, action: 'rejected', label: 'Reject' })}
            disabled={actionLoading === s.id}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            Reject
          </button>
        </div>
      )
    }

    return (
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setShowNoteModal({ id: s.id, action: 'approved', label: 'Approve' })}
          disabled={actionLoading === s.id}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          Approve
        </button>
        <button
          onClick={() => setShowEditModal({ id: s.id, en: s.en, my: s.my, shn: s.shn, mnw: s.mnw, ksw: s.ksw, note: s.note })}
          disabled={actionLoading === s.id}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
          Edit
        </button>
        <button
          onClick={() => setShowNoteModal({ id: s.id, action: 'rejected', label: 'Reject' })}
          disabled={actionLoading === s.id}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
          Reject
        </button>
      </div>
    )
  }

  function getNoteModalTitle(modal: NoteModalState): string {
    switch (modal.action) {
      case 'approved': return modal.label === 'Approve Delete' ? 'Approve Deletion' : 'Approve Suggestion'
      case 'rejected': return 'Reject Suggestion'
      default: return 'Review Suggestion'
    }
  }

  function getNoteModalPlaceholder(modal: NoteModalState): string {
    switch (modal.action) {
      case 'approved': return 'Optional approval note...'
      case 'rejected': return 'Explain why this is being rejected...'
      default: return 'Add a note...'
    }
  }

  const languageFields = [
    { key: 'en', label: 'English' },
    { key: 'my', label: 'Burmese' },
    { key: 'shn', label: 'Shan' },
    { key: 'mnw', label: 'Mon' },
    { key: 'ksw', label: "S'gaw Karen" },
  ] as const

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

      {/* View tabs: Pending Reviews | Review History */}
      <div className="flex gap-2">
        <button
          onClick={() => { setView('pending'); setFilter('pending') }}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
            view === 'pending'
              ? 'bg-ubuntu-orange/20 text-ubuntu-orange border border-ubuntu-orange/30'
              : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'
          }`}
        >
          <Clock size={14} className="text-amber-400" />
          Pending Reviews
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400/30 text-amber-300">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setView('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
            view === 'history'
              ? 'bg-ubuntu-orange/20 text-ubuntu-orange border border-ubuntu-orange/30'
              : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'
          }`}
        >
          <Eye size={14} className="text-[var(--tx-dim)]" />
          Review History
        </button>
      </div>

      {/* ── Pending Reviews ── */}
      {view === 'pending' && (
        <>
          {/* Status filter sub-tabs */}
          <div className="flex gap-2 flex-wrap">
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
              {suggestions.map(s => {
                const sd = statusDisplay(s.status)
                const borderClass = s.status === 'pending' ? 'border-l-4 border-l-amber-400/50'
                  : s.status === 'approved' ? 'border-l-4 border-l-emerald-500/50'
                  : 'border-l-4 border-l-red-500/50'

                return (
                  <div key={s.id} className={`glass-card overflow-hidden transition-all ${borderClass}`}>
                    {/* Summary row */}
                    <div className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-table-row-hover)]"
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-sm font-mono text-[var(--tx-primary)]">{s.en}</code>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${sd.className}`}>
                            {sd.label}
                          </span>
                          <span className="text-[10px] text-[var(--tx-faint)] px-1.5 py-0.5 rounded bg-[var(--surface-overlay)]">
                            {actionDisplay(s.action)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--tx-dim)] mt-0.5">
                          by {s.submitterDisplayName || s.submitterUsername || 'Unknown'} · {formatTime(s.createdAt)}
                        </p>
                      </div>

                      {getActionButtons(s)}
                    </div>

                    {/* Expanded details */}
                    {expandedId === s.id && (
                      <div className="px-4 pb-4 pt-2 bg-[var(--surface-table-header)]/50 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                          {languageFields.map(col => (
                            <div key={col.key}>
                              <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 block">
                                {col.label}
                              </label>
                              <div className="input-field w-full text-sm bg-[var(--surface-overlay)] min-h-[2rem] flex items-center">
                                {s[col.key] || <span className="italic text-[var(--tx-faint)]">—</span>}
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
                            Reviewed by {s.reviewerDisplayName || s.reviewerUsername} · {formatTime(s.reviewedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Review History ── */}
      {view === 'history' && (
        <>
          <div className="flex justify-end">
            {reviewHistory.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all review history? This cannot be undone.')) {
                    clearReviewHistory()
                    loadReviewHistory()
                  }
                }}
                className="btn-ghost flex items-center gap-2 text-sm text-[var(--tx-muted)] hover:text-red-400"
              >
                <Trash2 size={14} />Clear History
              </button>
            )}
          </div>

          {reviewHistory.length === 0 ? (
            <div className="text-center py-12 text-[var(--tx-muted)]">
              <Eye className="mx-auto mb-4 text-[var(--tx-faint)]" size={48} />
              <p>No review history yet</p>
              <p className="text-sm text-[var(--tx-dim)] mt-1">Approved and rejected reviews will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reviewHistory.map(entry => (
                <div key={entry.id} className={`glass-card px-4 py-3 flex items-center gap-3 ${
                  entry.action === 'approved' ? 'border-l-4 border-l-emerald-500/50' : 'border-l-4 border-l-red-500/50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.action === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {entry.action === 'approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-[var(--tx-primary)]">{entry.termEn}</code>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        entry.action === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {entry.action === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                    {entry.reviewerNote && (
                      <p className="text-xs text-[var(--tx-dim)] mt-0.5">{entry.reviewerNote}</p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--tx-dim)] flex-shrink-0">{formatReviewTime(entry.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Note Modal (Approve / Reject) ── */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowNoteModal(null); setReviewNote('') }}>
          <div className="glass-card p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--tx-primary)]">
              {getNoteModalTitle(showNoteModal)}
            </h3>
            <div>
              <label className="text-xs text-[var(--tx-dim)] mb-1 block">Review note (optional)</label>
              <input
                type="text"
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder={getNoteModalPlaceholder(showNoteModal)}
                className="input-field w-full"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowNoteModal(null); setReviewNote('') }} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={() => handleReview(showNoteModal.id, showNoteModal.action, reviewNote)}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                  showNoteModal.action === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {showNoteModal.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal (Edit fields then Approve) ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditModal(null)}>
          <div className="glass-card p-6 w-full max-w-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--tx-primary)]">Edit & Approve</h3>
              <button onClick={() => setShowEditModal(null)} className="text-[var(--tx-dim)] hover:text-[var(--tx-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {languageFields.map(col => (
                <div key={col.key}>
                  <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 block">
                    {col.label}
                  </label>
                  <input
                    type="text"
                    value={showEditModal[col.key]}
                    onChange={e => setShowEditModal({ ...showEditModal, [col.key]: e.target.value })}
                    className="input-field w-full text-sm"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 block">Note</label>
              <input
                type="text"
                value={showEditModal.note}
                onChange={e => setShowEditModal({ ...showEditModal, note: e.target.value })}
                className="input-field w-full text-sm"
                placeholder="Optional note..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEditModal(null)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={() => handleEditAndApprove(showEditModal.id, showEditModal)}
                disabled={!showEditModal.en.trim() || actionLoading === showEditModal.id}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {actionLoading === showEditModal.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
