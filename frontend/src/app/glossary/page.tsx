'use client'

import { useState, useMemo } from 'react'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import { BookOpen, AlertCircle, CheckCircle2, Clock, HelpCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import glossaryData from '@/data/glossary.json'

const ITEMS_PER_PAGE = 20

const langColumns = [
  { code: 'en', label: 'English', flag: '🇬🇧', labelKey: 'glossary_english' },
  { code: 'my', label: 'Myanmar', flag: '🇲🇲', labelKey: 'glossary_myanmar' },
  { code: 'shn', label: 'Shan', flag: '🇲🇲', labelKey: 'glossary_shan' },
  { code: 'mnw', label: 'Mon', flag: '🇲🇲', labelKey: 'glossary_mon' },
  { code: 'ksw', label: "S'gaw Karen", flag: '🇲🇲', labelKey: 'glossary_karen' },
]

type GlossaryEntry = {
  id: number; en: string; my: string; shn: string; mnw: string; ksw: string
}

function getTranslationStatus(entry: GlossaryEntry): 'translated' | 'partial' | 'pending' {
  const langFields = [entry.my, entry.shn, entry.mnw, entry.ksw]
  const translated = langFields.filter(f => f && f.trim().length > 0).length
  if (translated === 4) return 'translated'
  if (translated > 0) return 'partial'
  return 'pending'
}

function getTranslatedCount(entry: GlossaryEntry): number {
  return [entry.my, entry.shn, entry.mnw, entry.ksw].filter(f => f && f.trim().length > 0).length
}

export default function GlossaryPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLang, setSelectedLang] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = glossaryData.entries as GlossaryEntry[]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(entry =>
        entry.en.toLowerCase().includes(q) || entry.my.toLowerCase().includes(q) ||
        entry.shn.toLowerCase().includes(q) || entry.mnw.toLowerCase().includes(q) ||
        entry.ksw.toLowerCase().includes(q)
      )
    }
    if (statusFilter) result = result.filter(entry => getTranslationStatus(entry) === statusFilter)
    return result
  }, [search, statusFilter])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const totalTranslated = (glossaryData.entries as GlossaryEntry[]).filter(e => getTranslationStatus(e) === 'translated').length
  const totalPartial = (glossaryData.entries as GlossaryEntry[]).filter(e => getTranslationStatus(e) === 'partial').length
  const totalPending = (glossaryData.entries as GlossaryEntry[]).filter(e => getTranslationStatus(e) === 'pending').length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('glossary_title', 'Glossary')}</h1>
          <p className="text-white/50 mt-1">{t('glossary_subtitle', 'Standardized terminology for consistent translations')}</p>
        </div>
        <span className="text-sm text-white/40">{glossaryData.entries.length} {t('glossary_terms', 'terms')}</span>
      </div>

      <div className="glass-card p-4 border-l-4 border-amber-500/50">
        <div className="flex gap-3">
          <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm text-white/70 font-medium">{t('glossary_personal_note', 'Personal Note')}</p>
            <p className="text-xs text-white/50 mt-0.5">{t('glossary_disclaimer', 'These are unofficial personal notes. Contributions are welcome via GitHub.')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'translated', icon: CheckCircle2, color: 'text-emerald-400', ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/[0.06]', count: totalTranslated, label: t('glossary_fully_translated', 'Fully Translated') },
          { key: 'partial', icon: Clock, color: 'text-amber-400', ring: 'ring-amber-500/30', bg: 'bg-amber-500/[0.06]', count: totalPartial, label: t('glossary_partial', 'Partial') },
          { key: 'pending', icon: HelpCircle, color: 'text-white/30', ring: 'ring-white/20', bg: 'bg-white/[0.06]', count: totalPending, label: t('glossary_pending', 'Pending') },
        ].map(stat => (
          <button key={stat.key} onClick={() => setStatusFilter(statusFilter === stat.key ? null : stat.key)}
            className={`glass-card p-3 text-center transition-all duration-200 ${statusFilter === stat.key ? `ring-2 ${stat.ring} ${stat.bg}` : 'hover:bg-white/[0.06]'}`}>
            <div className="flex items-center justify-center gap-2">
              <stat.icon size={16} className={stat.color} />
              <span className={`text-lg font-bold ${stat.color}`}>{stat.count}</span>
            </div>
            <p className="text-[10px] text-white/40 mt-1">{stat.label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setCurrentPage(1) }} placeholder={t('glossary_search', 'Search glossary terms...')} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {langColumns.slice(1).map((lang) => (
            <button key={lang.code} onClick={() => { setSelectedLang(selectedLang === lang.code ? null : lang.code); setCurrentPage(1) }}
              className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${selectedLang === lang.code ? 'bg-ubuntu-orange text-white shadow-lg shadow-ubuntu-orange/20' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
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
                {langColumns.map((lang) => (
                  <th key={lang.code} className={selectedLang && selectedLang !== lang.code ? 'hidden' : ''}>
                    {lang.flag} {t(lang.labelKey, lang.label)}
                  </th>
                ))}
                <th className="w-24">{t('glossary_status', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((entry) => {
                const status = getTranslationStatus(entry)
                const count = getTranslatedCount(entry)
                return (
                  <tr key={entry.id}>
                    <td data-label={t('glossary_english', 'English')} className="font-medium text-white">{entry.en}</td>
                    <td data-label={t('glossary_myanmar', 'Myanmar')} className={`font-myanmar ${selectedLang && selectedLang !== 'my' ? 'hidden' : ''}`}>{entry.my || <span className="text-white/20">—</span>}</td>
                    <td data-label={t('glossary_shan', 'Shan')} className={`font-myanmar ${selectedLang && selectedLang !== 'shn' ? 'hidden' : ''}`}>{entry.shn || <span className="text-white/20 italic">—</span>}</td>
                    <td data-label={t('glossary_mon', 'Mon')} className={`font-myanmar ${selectedLang && selectedLang !== 'mnw' ? 'hidden' : ''}`}>{entry.mnw || <span className="text-white/20 italic">—</span>}</td>
                    <td data-label={t('glossary_karen', "S'gaw Karen")} className={`font-myanmar ${selectedLang && selectedLang !== 'ksw' ? 'hidden' : ''}`}>{entry.ksw || <span className="text-white/20 italic">—</span>}</td>
                    <td data-label={t('glossary_status', 'Status')}>
                      {status === 'translated' && <span className="status-translated"><CheckCircle2 size={10} className="mr-1" />{t('glossary_full', 'Full')}</span>}
                      {status === 'partial' && <span className="status-partial"><Clock size={10} className="mr-1" />{count}/4</span>}
                      {status === 'pending' && <span className="status-pending">{t('glossary_pending', 'Pending')}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginated.map((entry) => {
          const status = getTranslationStatus(entry)
          const count = getTranslatedCount(entry)
          return (
            <div key={entry.id} className="glass-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <p className="font-medium text-white text-sm">{entry.en}</p>
                {status === 'translated' && <span className="status-translated"><CheckCircle2 size={10} className="mr-1" />{t('glossary_full', 'Full')}</span>}
                {status === 'partial' && <span className="status-partial"><Clock size={10} className="mr-1" />{count}/4</span>}
                {status === 'pending' && <span className="status-pending">{t('glossary_pending', 'Pending')}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[{ code: 'my', label: t('glossary_myanmar', 'Myanmar'), value: entry.my }, { code: 'shn', label: t('glossary_shan', 'Shan'), value: entry.shn }, { code: 'mnw', label: t('glossary_mon', 'Mon'), value: entry.mnw }, { code: 'ksw', label: t('glossary_karen', "Karen"), value: entry.ksw }].map(lang => (
                  <div key={lang.code} className="text-xs">
                    <span className="text-white/30">{lang.label}: </span>
                    {lang.value ? <span className="font-myanmar text-white/70">{lang.value}</span> : <span className="text-white/15 italic">—</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="mx-auto text-white/20 mb-4" size={48} />
          <p className="text-white/50 text-lg font-medium">{t('glossary_no_results', 'No terms match your search')}</p>
          <p className="text-white/30 text-sm mt-1">{t('glossary_no_results_hint', 'Try a different search term or clear filters')}</p>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}
