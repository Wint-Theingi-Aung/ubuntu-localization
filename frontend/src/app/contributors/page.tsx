'use client'

import { useState, useEffect, useMemo } from 'react'
import SearchInput from '@/components/SearchInput'
import Pagination from '@/components/Pagination'
import { Users, ExternalLink, Github, Globe, Star, Award, GitCommit } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import contributorsData from '@/data/contributors.json'

const ITEMS_PER_PAGE = 12

const langBadgeMap: Record<string, string> = {
  my: 'badge-orange',
  shn: 'badge-purple',
  mnw: 'badge-green',
  ksw: 'badge-blue',
}

const langNameMap: Record<string, string> = {
  my: 'Myanmar',
  shn: 'Shan',
  mnw: 'Mon',
  ksw: 'Karen',
}

export default function ContributorsPage() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const allContributors = useMemo(() => contributorsData.contributors, [])
  const totalKarma = useMemo(() => allContributors.reduce((s: number, c: any) => s + c.karma, 0), [allContributors])

  const filtered = useMemo(() => {
    if (!search) return allContributors
    const q = search.toLowerCase()
    return allContributors.filter(
      (c: any) =>
        c.username.toLowerCase().includes(q) ||
        c.display_name.toLowerCase().includes(q)
    )
  }, [search, allContributors])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">{t('contributors_title', 'Contributors')}</h1>
        <p className="text-white/50 mt-1">{t('contributors_subtitle', 'Real Ubuntu translators from Launchpad — ranked by karma')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card text-center">
          <div className="w-12 h-12 rounded-xl bg-ubuntu-orange/10 flex items-center justify-center mx-auto mb-2">
            <Users className="text-ubuntu-orange" size={24} />
          </div>
          <p className="text-3xl font-bold text-ubuntu-orange">{contributorsData.meta.total}</p>
          <p className="text-xs text-white/40 mt-1">{t('contributors_contributors', 'Contributors')}</p>
        </div>
        <div className="stat-card text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
            <Globe className="text-emerald-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-emerald-400">4</p>
          <p className="text-xs text-white/40 mt-1">{t('contributors_languages', 'Languages')}</p>
        </div>
        <div className="stat-card text-center">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
            <Star className="text-purple-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-purple-400">{totalKarma.toLocaleString()}</p>
          <p className="text-xs text-white/40 mt-1">{t('contributors_total_karma', 'Total Karma')}</p>
        </div>
        <div className="stat-card text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
            <Award className="text-blue-400" size={24} />
          </div>
          <p className="text-3xl font-bold text-blue-400">Myanmar</p>
          <p className="text-xs text-white/40 mt-1">{t('contributors_top_lang', 'Top Language')}</p>
        </div>
      </div>

      <SearchInput value={search} onChange={(v) => { setSearch(v); setCurrentPage(1) }} placeholder={t('contributors_search', 'Search contributors by username or display name...')} />

      <p className="text-xs text-white/30">
        {t('templates_showing', 'Showing')} {paginated.length} {t('templates_of', 'of')} {filtered.length} {t('contributors_contributors', 'contributors').toLowerCase()}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginated.map((contributor: any, idx: number) => (
          <div key={contributor.username} className="contributor-card">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-ubuntu-orange/20 flex items-center justify-center flex-shrink-0">
                <span className="text-ubuntu-orange font-bold text-lg">
                  {contributor.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white truncate">{contributor.display_name}</h3>
                  {idx === 0 && <Award className="text-amber-400 flex-shrink-0" size={16} />}
                </div>
                <p className="text-xs text-white/30 truncate">@{contributor.username}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm">
                <Star size={14} className="text-amber-400/60" />
                <span className="font-bold text-ubuntu-orange">{contributor.karma.toLocaleString()}</span>
                <span className="text-white/30 text-xs">{t('contributors_karma', 'karma')}</span>
              </div>
              <a href={contributor.web_link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors" title={t('contributors_view_profile', 'View Launchpad Profile')}>
                <Globe size={16} className="text-white/40" />
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
              <p className="mt-2 text-[10px] text-white/20 truncate">
                {contributor.teams.slice(0, 3).join(' • ')}
              </p>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Users className="mx-auto text-white/10 mb-4" size={48} />
          <p className="text-white/30 text-lg font-medium">{t('contributors_no_results', 'No contributors found')}</p>
          <p className="text-white/20 text-sm mt-1">{t('contributors_no_results_hint', 'Try a different search term')}</p>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <div className="glass-card p-6 text-center">
        <h3 className="font-semibold text-white mb-2">{t('contributors_want_to_contribute', 'Want to contribute?')}</h3>
        <p className="text-sm text-white/40 mb-4">{t('contributors_cta', 'Help translate Ubuntu into Myanmar, Shan, Mon, or S\'gaw Karen')}</p>
        <div className="flex justify-center gap-3">
          <a href="https://github.com/Wint-Theingi-Aung/ubuntu-localization" target="_blank" rel="noopener noreferrer" className="btn-outline inline-flex items-center gap-2">
            <Github size={16} />
            {t('contributors_view_github', 'View on GitHub')}
            <ExternalLink size={14} />
          </a>
          <a href="https://translations.launchpad.net/ubuntu" target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2">
            <Globe size={16} />
            {t('contributors_launchpad', 'Launchpad')}
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
