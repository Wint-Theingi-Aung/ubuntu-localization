'use client'

import { useState } from 'react'
import { History, Download, Languages, FileText, Clock, BookOpen } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface HistoryEntry { id: number; timestamp: string; user: string; action: 'translate' | 'export' | 'upload' | 'glossary'; description: string; language?: string; details?: string }

const historyData: HistoryEntry[] = [
  { id: 1, timestamp: '2026-06-30 14:30', user: 'wint-theingi-aung', action: 'translate', description: 'Translated 150 strings in gnome-control-center.po', language: 'Myanmar', details: 'AI batch translation with Gemini' },
  { id: 2, timestamp: '2026-06-30 14:25', user: 'wint-theingi-aung', action: 'export', description: 'Exported translated gnome-control-center.po', language: 'Myanmar', details: '+150 new translations, completion: 42%' },
  { id: 3, timestamp: '2026-06-30 13:15', user: 'wint-theingi-aung', action: 'upload', description: 'Uploaded gnome-shell.po for translation', language: 'Myanmar', details: '1,890 entries, 520 untranslated' },
  { id: 4, timestamp: '2026-06-30 10:45', user: 'gipsyhnh', action: 'translate', description: 'Translated 25 strings in nautilus.po', language: 'Shan', details: 'Manual translation' },
  { id: 5, timestamp: '2026-06-29 16:20', user: 'wint-theingi-aung', action: 'glossary', description: 'Added 10 glossary terms', details: 'Network, Security, System terms' },
  { id: 6, timestamp: '2026-06-29 15:00', user: 'htetminaung2018', action: 'translate', description: 'Translated 15 strings in firefox.po', language: 'Mon', details: 'Manual translation' },
  { id: 7, timestamp: '2026-06-29 11:30', user: 'wint-theingi-aung', action: 'export', description: 'Exported translated nautilus.po', language: 'Myanmar', details: '+280 new translations, completion: 65%' },
  { id: 8, timestamp: '2026-06-28 09:15', user: 'clementlefebvre', action: 'translate', description: 'Translated 8 strings in gnome-calculator.po', language: "S'gaw Karen", details: 'Manual translation' },
]

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
  const filtered = filter ? historyData.filter(h => h.action === filter) : historyData

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('history_title', 'History')}</h1>
        <p className="text-[var(--tx-muted)] mt-1">{t('history_subtitle', 'Recent translation activities')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
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
                    <div className="flex items-center gap-1 text-xs text-[var(--tx-dim)] flex-shrink-0 ml-4"><Clock size={12} />{entry.timestamp}</div>
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
                <span className="flex items-center gap-1 flex-shrink-0"><Clock size={10} />{entry.timestamp}</span>
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
