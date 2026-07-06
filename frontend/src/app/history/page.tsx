'use client'

import { useState, useMemo } from 'react'
import { History, Download, Languages, FileText, Clock, BookOpen, Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { getHistory, clearHistory, formatTimestamp, type HistoryEntry } from '@/lib/history'

const actionIcons: Record<string, typeof Languages> = { translate: Languages, export: Download, upload: FileText, glossary: BookOpen }
const actionColors: Record<string, string> = { translate: 'text-ubuntu-orange bg-ubuntu-orange/20', export: 'text-emerald-400 bg-emerald-400/20', upload: 'text-blue-400 bg-blue-400/20', glossary: 'text-purple-400 bg-purple-400/20' }

const filterOptions: { key: string | null; labelKey: string; fallback: string }[] = [
  { key: null, labelKey: 'history_filter_all', fallback: 'All' },
  { key: 'translate', labelKey: 'history_filter_translate', fallback: 'Translate' },
  { key: 'export', labelKey: 'history_filter_export', fallback: 'Export' },
  { key: 'upload', labelKey: 'history_filter_upload', fallback: 'Upload' },
  { key: 'glossary', labelKey: 'history_filter_glossary', fallback: 'Glossary' },
]

export default function HistoryPage() {
  const { t } = useI18n()
  const [filter, setFilter] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Re-read from localStorage when filter or refreshKey changes
  const allHistory = useMemo(() => getHistory(), [refreshKey])
  const filtered = useMemo(() => filter ? allHistory.filter(h => h.action === filter) : allHistory, [filter, allHistory])

  const handleClear = () => {
    if (window.confirm(t('history_clear_confirm', 'Are you sure you want to clear all translation history? This cannot be undone.'))) {
      clearHistory()
      setRefreshKey(k => k + 1)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('history_title', 'History')}</h1>
          <p className="text-[var(--tx-muted)] mt-1">{t('history_subtitle', 'Recent translation activities')} — {allHistory.length} {t('history_entries', 'entries')}</p>
        </div>
        {allHistory.length > 0 && (
          <button onClick={handleClear} className="btn-ghost flex items-center gap-2 text-sm text-[var(--tx-muted)] hover:text-red-400">
            <Trash2 size={14} />{t('history_clear', 'Clear History')}
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {filterOptions.map(opt => (
          <button key={opt.key || 'all'} onClick={() => setFilter(opt.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${filter === opt.key ? 'bg-ubuntu-orange text-white shadow-lg shadow-ubuntu-orange/20' : 'bg-[var(--surface-overlay)] text-[var(--tx-muted)] hover:text-[var(--tx-primary)]'}`}>
            {t(opt.labelKey, opt.fallback)}
          </button>
        ))}
      </div>

      {/* Desktop Timeline */}
      <div className="hidden md:block relative">
        <div className="absolute left-8 top-0 bottom-0 w-px bg-[var(--border-theme)]" />
        <div className="space-y-6">
          {filtered.map(entry => {
            const Icon = actionIcons[entry.action]; const c = actionColors[entry.action]
            return (
              <div key={entry.id} className="timeline-item">
                <div className={`timeline-icon ${c}`}><Icon size={24} /></div>
                <div className="timeline-content glass-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[var(--tx-primary)] font-medium">{entry.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-[var(--tx-muted)]">{entry.user}</span>
                        {entry.language && <span className="badge-orange">{entry.language}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--tx-dim)] flex-shrink-0 ml-4"><Clock size={12} />{formatTimestamp(entry.timestamp, t)}</div>
                  </div>
                  {entry.details && <p className="text-sm text-[var(--tx-muted)] mt-2">{entry.details}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(entry => {
          const Icon = actionIcons[entry.action]; const c = actionColors[entry.action]
          return (
            <div key={entry.id} className="glass-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${c}`}><Icon size={18} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--tx-primary)] font-medium text-sm">{entry.description}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-[var(--tx-dim)]">{entry.user}</span>
                    {entry.language && <span className="badge-orange text-[10px]">{entry.language}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--tx-dim)]">
                <span>{entry.details}</span>
                <span className="flex items-center gap-1 flex-shrink-0"><Clock size={10} />{formatTimestamp(entry.timestamp, t)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <History className="mx-auto text-[var(--tx-faint)] mb-4" size={48} />
          <p className="text-[var(--tx-muted)] text-lg font-medium">{t('history_empty', 'No activities match your filter')}</p>
          <p className="text-[var(--tx-dim)] text-sm mt-1">{t('history_empty_hint', 'Try selecting a different filter')}</p>
        </div>
      )}
    </div>
  )
}
