'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, X, Eye, MessageSquare } from 'lucide-react'
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

type FilterStatus = 'pending' | 'changes_requested' | 'approved' | 'rejected' | ''

type NoteModalState = {
  id: number
  action: 'approved' | 'rejected' | 'changes_requested'
  label: string
}

function formatTime(ts: string | number | null | undefined): string {
  if (ts === null || ts === undefined || ts === '') return 'Unknown date'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return 'Unknown date'
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function statusDisplay(status: string): { label: string; className: string } {
  switch (status) {
    case 'pending': return { label: 'Pending Review', className: 'bg-amber-400/20 text-amber-400' }
    case 'changes_requested': return { label: 'Changes Requested', className: 'bg-blue-400/20 text-blue-400' }
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

  const handleReview = async (id: number, status: 'approved' | 'rejected' | 'changes_requested', note?: string) => {
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

  function getActionButtons(s: Suggestion) {
    if (s.status !== 'pending' && s.status !== 'changes_requested') return null

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
          onClick={() => setShowNoteModal({ id: s.id, action: 'changes_requested', label: 'Request Changes' })}
          disabled={actionLoading === s.id}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
          Request Changes
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
      case 'changes_requested': return 'Request Changes'
      default: return 'Review Suggestion'
    }
  }

  function getNoteModalButtonLabel(modal: NoteModalState): string {
    return modal.label
  }

  function getNoteModalButtonColor(modal: NoteModalState): string {
    switch (modal.action) {
      case 'approved': return 'bg-emerald-600 hover:bg-emerald-700'
      case 'rejected': return 'bg-red-600 hover:bg-red-700'
      case 'changes_requested': return 'bg-blue-600 hover:bg-blue-700'
      default: return 'bg-emerald-600 hover:bg-emerald-700'
    }
  }

  function getNoteModalPlaceholder(modal: NoteModalState): string {
    switch (modal.action) {
      case 'approved': return 'Optional approval note...'
      case 'rejected': return 'Explain why this is being rejected...'
      case 'changes_requested': return 'What changes are needed? The submitter will see this...'
      default: return 'Add a note...'
    }
  }

  function isNoteRequired(modal: NoteModalState): boolean {
    return modal.action === 'changes_requested'
  }

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
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'pending' as const, label: 'Pending Review', icon: Clock, color: 'text-amber-400' },
          { value: 'changes_requested' as const, label: 'Changes Requested', icon: MessageSquare, color: 'text-blue-400' },
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
          {suggestions.map(s => {
            const sd = statusDisplay(s.status)
            const borderClass = s.status === 'pending' ? 'border-l-4 border-l-amber-400/50'
              : s.status === 'changes_requested' ? 'border-l-4 border-l-blue-400/50'
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
                        <label className="text-[10px] text-[var(--tx-faint)] uppercase tracking-wider font-semibold mb-1 block">
                          {s.status === 'changes_requested' ? 'Requested Changes' : 'Review Note'}
                        </label>
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

      {/* Review note modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setShowNoteModal(null); setReviewNote('') }}>
          <div className="glass-card p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--tx-primary)]">
              {getNoteModalTitle(showNoteModal)}
            </h3>
            <div>
              <label className="text-xs text-[var(--tx-dim)] mb-1 block">
                Review note {isNoteRequired(showNoteModal) ? '(required)' : '(optional)'}
              </label>
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
                disabled={isNoteRequired(showNoteModal) && !reviewNote.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${getNoteModalButtonColor(showNoteModal)} disabled:opacity-50`}
              >
                {getNoteModalButtonLabel(showNoteModal)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
