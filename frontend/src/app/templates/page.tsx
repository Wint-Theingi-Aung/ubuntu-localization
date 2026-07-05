'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import { ExternalLink, Package, ArrowUpDown, Filter, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { lpTranslateUrl, lpUbuntuUrl, LANGUAGES, UBUNTU_RELEASE } from '@/lib/constants'
import templatesData from '@/data/templates.json'
import staticMetrics from '@/data/metrics-my.json'
import type { TranslationTemplate } from '@/app/api/translation-progress/route'

const ITEMS_PER_PAGE = 20

const allPkgCategories = Array.from(new Set(templatesData.packages.map((p: { category: string }) => p.category))).sort()
const categories = ['All', ...allPkgCategories] as string[]
const priorities = ['All', 'high', 'medium', 'low']

const langLinks = LANGUAGES.map(l => ({ code: l.code, label: l.code.toUpperCase(), name: l.name }))

const priorityColors: Record<string, string> = {
  high: 'badge-orange',
  medium: 'badge-yellow',
  low: 'badge-green',
}

// ── Metrics type (per-package lookup) ─────────────────────────────────
type MetricsMap = Record<string, TranslationTemplate>

export default function TemplatesPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [priority, setPriority] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'name' | 'untranslated' | 'priority' | 'total'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // ── Localization metrics state ────────────────────────────────────
  const [metrics, setMetrics] = useState<MetricsMap>({})
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState(false)

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true)
    setMetricsError(false)
    try {
      const res = await fetch('/api/translation-progress?lang=my')
      const data = await res.json()
      if (data.templates && Array.isArray(data.templates)) {
        const map: MetricsMap = {}
        for (const tmpl of data.templates) {
          map[tmpl.name] = tmpl
        }
        setMetrics(map)
      } else {
        setMetricsError(true)
      }
    } catch {
      setMetricsError(true)
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  // Load static metrics instantly, then refresh from API in background
  useEffect(() => {
    // Instant: load from bundled static JSON
    const map: MetricsMap = {}
    for (const [name, m] of Object.entries(staticMetrics as Record<string, any>)) {
      map[name] = {
        name,
        sourcePackage: '',
        total: m.total,
        translated: m.translated,
        untranslated: m.untranslated,
        completionPct: m.completionPct,
      }
    }
    setMetrics(map)
    // Background: refresh from API (gets latest data)
    fetchMetrics()
  }, [fetchMetrics])

  const filtered = useMemo(() => {
    let result = templatesData.packages as any[]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((p: any) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }
    if (category !== 'All') result = result.filter((p: any) => p.category === category)
    if (priority !== 'All') result = result.filter((p: any) => p.priority === priority)

    result = [...result].sort((a: any, b: any) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'untranslated') {
        const aUn = metrics[a.name]?.untranslated ?? a.entries
        const bUn = metrics[b.name]?.untranslated ?? b.entries
        cmp = aUn - bUn
      }
      else if (sortBy === 'priority') {
        const order = { high: 0, medium: 1, low: 2 }
        cmp = (order[a.priority as keyof typeof order] ?? 1) - (order[b.priority as keyof typeof order] ?? 1)
      }
      else if (sortBy === 'total') {
        const aTotal = metrics[a.name]?.total ?? a.entries
        const bTotal = metrics[b.name]?.total ?? b.entries
        cmp = aTotal - bTotal
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [search, category, priority, sortBy, sortDir, metrics])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const toggleSort = (field: 'name' | 'untranslated' | 'priority' | 'total') => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('asc') }
  }

  // Merge metrics into paginated items
  const paginatedWithMetrics = useMemo(() => {
    return paginated.map((pkg: any) => ({
      ...pkg,
      metrics: metrics[pkg.name] || null,
    }))
  }, [paginated, metrics])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('templates_title', 'Templates')}</h1>
          <p className="text-[var(--tx-muted)] mt-1">
            {t('templates_subtitle', 'Ubuntu packages requiring translation')} — {templatesData.packages.length} {t('templates_total', 'total')}
          </p>
        </div>
        <a href={lpUbuntuUrl()} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2 text-sm">
          {t('templates_view_launchpad', 'View on Launchpad')} ({UBUNTU_RELEASE})
          <ExternalLink size={14} />
        </a>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setCurrentPage(1) }} placeholder={t('templates_search', 'Search packages by name or description...')} />
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <select value={category} onChange={(e) => { setCategory(e.target.value); setCurrentPage(1) }} className="input-field text-sm">
            {categories.map((c: string) => (
              <option key={c} value={c}>{c === 'All' ? t('templates_all_categories', 'All Categories') : c}</option>
            ))}
          </select>
          <select value={priority} onChange={(e) => { setPriority(e.target.value); setCurrentPage(1) }} className="input-field text-sm">
            {priorities.map((p: string) => (
              <option key={p} value={p}>{p === 'All' ? t('templates_all_priorities', 'All Priorities') : p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--tx-dim)]">
          {t('templates_showing', 'Showing')} {paginated.length} {t('templates_of', 'of')} {filtered.length} {t('templates_packages', 'packages')}
          {metricsLoading && <span className="ml-2 inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> {t('templates_loading_metrics', 'Loading metrics...')}</span>}
          {metricsError && <span className="ml-2 text-amber-500">{t('templates_metrics_unavailable', 'Metrics unavailable')}</span>}
        </p>
        <div className="flex items-center gap-2 text-sm text-[var(--tx-dim)]">
          <Filter size={12} />
          {category !== 'All' && <span className="badge-blue">{category}</span>}
          {priority !== 'All' && <span className={priorityColors[priority]}>{priority}</span>}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="glass-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-[var(--tx-secondary)] transition-colors text-sm font-semibold">
                    {t('templates_package', 'Package')}
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="text-sm font-semibold">{t('templates_category', 'Category')}</th>
                <th>
                  <button onClick={() => toggleSort('priority')} className="flex items-center gap-1 hover:text-[var(--tx-secondary)] transition-colors text-sm font-semibold">
                    {t('templates_priority', 'Priority')}
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th>
                  <button onClick={() => toggleSort('untranslated')} className="flex items-center gap-1 hover:text-[var(--tx-secondary)] transition-colors text-sm font-semibold">
                    {t('templates_untranslated', 'Untranslated')}
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th>
                  <button onClick={() => toggleSort('total')} className="flex items-center gap-1 hover:text-[var(--tx-secondary)] transition-colors text-sm font-semibold">
                    {t('templates_total_strings', 'Total')}
                    <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="text-sm font-semibold">{t('templates_translate', 'Translate')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedWithMetrics.map((pkg: any) => (
                <tr key={pkg.id}>
                  <td data-label={t('templates_package', 'Package')}>
                    <div>
                      <p className="font-medium text-[var(--tx-primary)] text-[15px]">{pkg.name}</p>
                      <p className="text-xs text-[var(--tx-dim)] mt-0.5 font-mono">{pkg.description}</p>
                    </div>
                  </td>
                  <td data-label={t('templates_category', 'Category')}>
                    <span className="badge-blue text-xs">{pkg.category}</span>
                  </td>
                  <td data-label={t('templates_priority', 'Priority')}>
                    <span className={`${priorityColors[pkg.priority]} text-xs`}>{pkg.priority}</span>
                  </td>
                  <td data-label={t('templates_untranslated', 'Untranslated')} className="font-mono text-sm">
                    {pkg.metrics ? (
                      <span className={pkg.metrics.untranslated > 0 ? 'text-red-400 font-semibold' : 'text-green-400'}>
                        {pkg.metrics.untranslated > 0 ? pkg.metrics.untranslated.toLocaleString() : '0'}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--tx-faint)]">—</span>
                    )}
                  </td>
                  <td data-label={t('templates_total_strings', 'Total')} className="font-mono text-sm font-semibold text-sky-400">
                    {pkg.metrics ? pkg.metrics.total.toLocaleString() : <span className="text-xs text-[var(--tx-faint)]">—</span>}
                  </td>
                  <td data-label={t('templates_translate', 'Translate')}>
                    <div className="flex gap-1">
                      {langLinks.map((lang) => (
                        <a key={lang.code} href={lpTranslateUrl(pkg.name, lang.code, pkg.sourcePackage)} target="_blank" rel="noopener noreferrer" className="lp-link"
                          title={`${t('templates_translate', 'Translate')} ${pkg.name} → ${lang.name}`}>
                          {lang.label}
                          <ExternalLink size={8} />
                        </a>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedWithMetrics.map((pkg: any) => (
          <div key={pkg.id} className="glass-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-[var(--tx-primary)] text-[15px]">{pkg.name}</p>
                <p className="text-xs text-[var(--tx-dim)] mt-0.5 font-mono">{pkg.description}</p>
              </div>
              <div className="flex gap-1.5">
                <span className="badge-blue text-xs">{pkg.category}</span>
                <span className={`${priorityColors[pkg.priority]} text-xs`}>{pkg.priority}</span>
              </div>
            </div>

            {/* Metrics row */}
            {pkg.metrics && (
              <div className="flex items-center gap-3 text-xs">
                <span className={`font-mono ${pkg.metrics.untranslated > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {pkg.metrics.untranslated > 0 ? pkg.metrics.untranslated.toLocaleString() : '0'} {t('templates_untranslated_short', 'untrans')}
                </span>
                <span className="font-mono font-semibold text-sky-400">
                  {pkg.metrics.total.toLocaleString()} {t('templates_total_short', 'total')}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end">
              <div className="flex gap-1.5 lp-links-cell">
                {langLinks.map((lang) => (
                  <a key={lang.code} href={lpTranslateUrl(pkg.name, lang.code, pkg.sourcePackage)} target="_blank" rel="noopener noreferrer" className="lp-link"
                    title={`${t('templates_translate', 'Translate')} → ${lang.name}`}>
                    {lang.label}
                    <ExternalLink size={8} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Package className="mx-auto text-[var(--tx-faint)] mb-4" size={48} />
          <p className="text-[var(--tx-dim)] text-lg font-medium">{t('templates_empty', 'No packages match your filters')}</p>
          <p className="text-[var(--tx-faint)] text-sm mt-1">{t('templates_empty_hint', 'Try adjusting your search or filters')}</p>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}
