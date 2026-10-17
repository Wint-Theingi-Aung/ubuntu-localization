'use client'

import { useState, useMemo } from 'react'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import { Users, ExternalLink, Github, Globe, Star, Award, AlertTriangle, RefreshCw } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import contributorsData from '@/data/contributors.json'

const ITEMS_PER_PAGE = 12

const langBadgeMap: Record<string, string> = { my: 'badge-orange', shn: 'badge-purple', mnw: 'badge-green', ksw: 'badge-blue' }
const langNameMap: Record<string, string> = { my: 'Burmese', shn: 'Shan', mnw: 'Mon', ksw: "S'gaw Karen" }

interface Contributor {
  username: string
  display_name: string
  karma: number
  web_link: string
  language_codes: string[]
  teams: string[]
}

function formatFetchedAt(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function ContributorsPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const allContributors = useMemo(
    () => (contributorsData.contributors || []) as Contributor[],
    []
  )
  const meta = contributorsData.meta as {
    total?: number
    source?: string
    series?: string
    fetchedAt?: string
    description?: string
  }
  const totalKarma = useMemo(
    () => allContributors.reduce((s, c) => s + (c.karma || 0), 0),
    [allContributors]
  )
  const lastUpdated = formatFetchedAt(meta.fetchedAt)
  const hasData = allContributors.length > 0

  const filtered = useMemo(() => {
    if (!search) return allContributors
    const q = search.toLowerCase()
    return allContributors.filter(
      c => c.username.toLowerCase().includes(q) || c.display_name.toLowerCase().includes(q)
    )
  }, [search, allContributors])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Global rank across full Launchpad list (not just current page)
  const rankOf = (c: Contributor) => allContributors.findIndex(x => x.username === c.username) + 1

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('contributors_title', 'Contributors')}</h1>
          <p className="text-[var(--tx-muted)] mt-1">{t('contributors_subtitle', 'Real Ubuntu translators from Launchpad — ranked by karma')}</p>
          {lastUpdated && (
            <p className="text-xs text-[var(--tx-dim)] mt-2">
              {t('contributors_last_updated', 'Last updated')}:{' '}
              <time dateTime={meta.fetchedAt}>{lastUpdated}</time>
              {meta.series && (
                <span className="text-[var(--tx-faint)]">
                  {' · '}
                  {t('contributors_series', 'Series')}: {meta.series}
                </span>
              )}
            </p>
          )}
        </div>
        {hasData && (
          <a
            href="https://translations.launchpad.net/ubuntu/stonking"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-2 text-sm self-start"
          >
            {t('contributors_view_launchpad', 'View on Launchpad')}
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {!hasData && (
        <div className="glass-card p-8 text-center">
          <AlertTriangle className="mx-auto text-amber-400 mb-3" size={40} />
          <p className="text-[var(--tx-primary)] font-semibold mb-1">
            {t('contributors_error_title', 'Contributor data unavailable')}
          </p>
          <p className="text-sm text-[var(--tx-muted)] mb-4">
            {t('contributors_error_hint', 'Launchpad data could not be loaded. Try again later.')}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-outline inline-flex items-center gap-2"
          >
            <RefreshCw size={14} />
            {t('contributors_reload', 'Reload')}
          </button>
        </div>
      )}

      {hasData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, color: 'text-ubuntu-orange', bg: 'bg-ubuntu-orange/10', val: (meta.total ?? allContributors.length).toLocaleString('en-US'), label: t('contributors_contributors', 'Contributors') },
              { icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10', val: '4', label: t('contributors_languages', 'Languages') },
              { icon: Star, color: 'text-purple-400', bg: 'bg-purple-500/10', val: totalKarma.toLocaleString('en-US'), label: t('contributors_total_karma', 'Total Karma') },
              { icon: Award, color: 'text-blue-400', bg: 'bg-blue-500/10', val: allContributors[0]?.display_name?.split(' ')[0] || '—', label: t('contributors_top_contributor', 'Top Contributor') },
            ].map(s => (
              <div key={s.label} className="stat-card glass-card p-4 text-center">
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2`}><s.icon className={s.color} size={24} /></div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-xs text-[var(--tx-dim)] mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setCurrentPage(1) }}
            placeholder={t('contributors_search', 'Search contributors by username or display name...')}
          />

          <p className="text-xs text-[var(--tx-dim)]">
            {t('templates_showing', 'Showing')} {paginated.length} {t('templates_of', 'of')} {filtered.length}
            {meta.source && (
              <span className="text-[var(--tx-faint)]"> · {meta.source}</span>
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((contributor) => {
              const rank = rankOf(contributor)
              return (
                <div key={contributor.username} className="contributor-card glass-card glass-card-hover p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-ubuntu-orange/20 flex items-center justify-center">
                        <span className="text-ubuntu-orange font-bold text-lg">
                          {contributor.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="absolute -top-2 -left-2 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-[var(--surface-overlay)] border border-[var(--border)] text-[10px] font-bold text-[var(--tx-secondary)] flex items-center justify-center">
                        #{rank}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--tx-primary)] truncate">{contributor.display_name}</h3>
                        {rank === 1 && <Award className="text-amber-400 flex-shrink-0" size={16} />}
                      </div>
                      <p className="text-xs text-[var(--tx-dim)] truncate">@{contributor.username}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Star size={14} className="text-amber-400/60" />
                      <span className="font-bold text-ubuntu-orange">{(contributor.karma || 0).toLocaleString('en-US')}</span>
                      <span className="text-[var(--tx-dim)] text-xs">{t('contributors_karma', 'karma')}</span>
                    </div>
                    <a
                      href={contributor.web_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-[var(--surface-overlay)] transition-colors"
                      title={t('contributors_view_profile', 'View Launchpad Profile')}
                    >
                      <Globe size={16} className="text-[var(--tx-dim)]" />
                    </a>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {contributor.language_codes.map((code: string) => (
                      <span key={code} className={`${langBadgeMap[code] || 'badge-blue'} text-[10px]`}>
                        {langNameMap[code] || code}
                      </span>
                    ))}
                  </div>
                  {contributor.teams.length > 0 && (
                    <p className="mt-2 text-[10px] text-[var(--tx-faint)] truncate">
                      {contributor.teams.slice(0, 3).join(' • ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Users className="mx-auto text-[var(--tx-faint)] mb-4" size={48} />
              <p className="text-[var(--tx-dim)] text-lg font-medium">{t('contributors_no_results', 'No contributors found')}</p>
              <p className="text-[var(--tx-faint)] text-sm mt-1">{t('contributors_no_results_hint', 'Try a different search term')}</p>
            </div>
          )}

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      <div className="glass-card p-6 text-center">
        <h3 className="font-semibold text-[var(--tx-primary)] mb-2">{t('contributors_want_to_contribute', 'Want to contribute?')}</h3>
        <p className="text-sm text-[var(--tx-muted)] mb-4">{t('contributors_cta', "Help translate Ubuntu into Burmese, Shan, Mon, or S'gaw Karen")}</p>
        <div className="flex justify-center gap-3">
          <a href="https://github.com/Wint-Theingi-Aung/ubuntu-localization" target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center gap-2">
            <Github size={16} />{t('contributors_view_github', 'View on GitHub')}<ExternalLink size={14} />
          </a>
          <a href="https://translations.launchpad.net/ubuntu/stonking" target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2">
            <Globe size={16} />{t('contributors_launchpad', 'Launchpad')}<ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
