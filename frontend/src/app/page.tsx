'use client'
import { useState, useEffect, useCallback } from 'react'
import LanguageCard from '@/components/LanguageCard'
import { Languages, FileCode, FileText, BookOpen, Users, ArrowRight, Sparkles, ExternalLink, Github, Rocket, Clock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { LANGUAGES, TRANSLATION_STATS, DASHBOARD_STATS, lpLanguageUrl } from '@/lib/constants'
import { getHistory, formatTimestamp, type HistoryEntry } from '@/lib/history'
import type { TranslationTemplate } from '@/lib/types'

const actionIconMap: Record<string, typeof Languages> = { translate: Languages, export: FileCode, upload: FileText, glossary: BookOpen }
const actionColorMap: Record<string, string> = { translate: 'text-ubuntu-orange', export: 'text-emerald-400', upload: 'text-blue-400', glossary: 'text-purple-400' }

// Aggregate per-template stats into per-language totals
function aggregateLangStats(templates: TranslationTemplate[], langCode: string) {
  // For now, we fetch my (Myanmar) as the primary language for dashboard display
  // The API returns per-template stats for the requested language
  let total = 0
  let translated = 0
  for (const t of templates) {
    total += t.total
    translated += t.translated
  }
  const progress = total > 0 ? Math.round((translated / total) * 1000) / 10 : 0
  return { totalEntries: total, translatedEntries: translated, progress }
}

export default function Dashboard() {
  const { t, ti, lang } = useI18n()
  const [mounted, setMounted] = useState(false)
  const [recentActivity, setRecentActivity] = useState<HistoryEntry[]>([])
  const [liveStats, setLiveStats] = useState<Record<string, { totalEntries: number; translatedEntries: number; progress: number }>>({})
  const [statsLoading, setStatsLoading] = useState(false)

  // Fetch live translation progress for all languages
  const fetchLiveStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const results: Record<string, { totalEntries: number; translatedEntries: number; progress: number }> = {}
      // Fetch in parallel for all languages
      const promises = LANGUAGES.map(async (l) => {
        try {
          const res = await fetch(`/api/translation-progress?lang=${l.code}`)
          const data = await res.json()
          if (data.templates && Array.isArray(data.templates)) {
            results[l.code] = aggregateLangStats(data.templates, l.code)
          }
        } catch {
          // Use static fallback
        }
      })
      await Promise.all(promises)
      if (Object.keys(results).length > 0) {
        setLiveStats(results)
      }
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    setRecentActivity(getHistory().slice(0, 5))
    fetchLiveStats()
  }, [fetchLiveStats])

  const languageData = LANGUAGES.map(lang => {
    const staticStats = TRANSLATION_STATS.find(s => s.code === lang.code)!
    const live = liveStats[lang.code]
    return {
      ...lang,
      totalEntries: live?.totalEntries ?? staticStats.totalEntries,
      translatedEntries: live?.translatedEntries ?? staticStats.translatedEntries,
      progress: live?.progress ?? staticStats.progress,
    }
  })

  const stats = [
    { label: t('dashboard_languages', 'Languages'), value: String(DASHBOARD_STATS.languages), icon: Languages, color: 'text-ubuntu-orange', bg: 'bg-ubuntu-orange/10', href: '/translate' },
    { label: t('dashboard_templates', 'Templates'), value: String(DASHBOARD_STATS.templates), icon: FileCode, color: 'text-purple-400', bg: 'bg-purple-500/10', href: '/templates' },
    { label: t('dashboard_glossary_terms', 'Glossary Terms'), value: String(DASHBOARD_STATS.glossaryTerms), icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10', href: '/glossary' },
    { label: t('dashboard_contributors', 'Contributors'), value: String(DASHBOARD_STATS.contributors), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10', href: '/contributors' },
  ]

  const quickActions = [
    { href: '/translate', icon: Languages, iconColor: 'text-ubuntu-orange', hoverColor: 'group-hover:text-ubuntu-orange', title: t('dashboard_ai_translation', 'AI Translation'), desc: t('dashboard_ai_desc', 'Upload .po files and translate with Gemini AI') },
    { href: '/guide', icon: BookOpen, iconColor: 'text-blue-400', hoverColor: 'group-hover:text-blue-400', title: t('dashboard_guide_action', 'Translation Guide'), desc: t('dashboard_guide_desc', 'Best practices for Ubuntu localization') },
    { href: 'https://launchpad.net/', icon: Users, iconColor: 'text-purple-400', hoverColor: 'group-hover:text-purple-400', title: t('dashboard_join_contributors', 'Join Contributors'), desc: t('dashboard_join_contributors_desc', 'Connect with the translation community'), external: true },
    { href: '/get-started', icon: Rocket, iconColor: 'text-emerald-400', hoverColor: 'group-hover:text-emerald-400', title: t('dashboard_get_started', 'Get Started'), desc: t('dashboard_get_started_desc', 'Create account, join team, make your first translation') },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('dashboard_title', 'Dashboard')}</h1>
            <Sparkles className="text-ubuntu-orange animate-pulse-slow" size={24} />
          </div>
          <p className="text-[var(--tx-secondary)] mt-1">{t('dashboard_subtitle', 'AI-powered Ubuntu localization for indigenous Burmese languages')}</p>
        </div>
        <Link href="/get-started" className="btn-primary flex items-center gap-2 w-fit">
          <Languages size={18} />
          {t('get_started_title', 'Get Started')}
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="stat-card glass-card p-4 glass-card-hover">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--tx-primary)]">{stat.value}</p>
                <p className="text-sm text-[var(--tx-secondary)]">{stat.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold text-[var(--tx-primary)]">{t('dashboard_translation_progress', 'Translation Progress')}</h2>
          {statsLoading && <Loader2 size={16} className="animate-spin text-ubuntu-orange" />}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {languageData.map((lang) => (
            <a
              key={lang.code}
              href={lpLanguageUrl(lang.code)}
              target="_blank"
              rel="noopener noreferrer"
              title={`${t('dashboard_view_launchpad', 'View on Launchpad')} — ${lang.name}`}
            >
              <LanguageCard
                code={lang.code}
                name={lang.name}
                native={lang.native}
                color={lang.color}
                progress={lang.progress}
                totalEntries={lang.totalEntries}
                translatedEntries={lang.translatedEntries}
              />
            </a>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-[var(--tx-primary)] mb-4">{t('dashboard_quick_actions', 'Quick Actions')}</h2>
        <p className="text-xs text-[var(--tx-dim)] mb-4 -mt-2">{t('dashboard_new_contributor_note', 'New contributor? We recommend reading Get Started and the Translation Guide before translating.')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            action.external ? (
              <div key={action.href} className="glass-card glass-card-hover p-6 group cursor-pointer" onClick={() => window.open(action.href, '_blank', 'noopener,noreferrer')}>
                <action.icon className={`${action.iconColor} mb-3`} size={32} />
                <h3 className={`font-semibold text-[var(--tx-primary)] ${action.hoverColor} transition-colors`}>
                  {action.title}
                </h3>
                <p className="text-sm text-[var(--tx-secondary)] mt-1">{action.desc}</p>
                {mounted && lang === 'en' && action.href === 'https://launchpad.net/' && (
                  <div className="mt-3 space-y-2 border-t border-[var(--border-light)] pt-3">
                    <a href="https://launchpad.net/~ubuntu-mm" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Ubuntu Myanmar LoCo Team
                    </a>
                    <a href="https://launchpad.net/~ubuntu-shn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Ubuntu Shan LoCo Team
                    </a>
                    <a href="https://launchpad.net/~lp-l10n-mnw" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Launchpad Mon Translation
                    </a>
                  </div>
                )}
                {mounted && lang === 'my' && action.href === 'https://launchpad.net/' && (
                  <div className="mt-3 space-y-2 border-t border-[var(--border-light)] pt-3">
                    <a href="https://launchpad.net/~ubuntu-mm" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Ubuntu Myanmar LoCo Team
                    </a>
                    <a href="https://launchpad.net/~lp-l10n-my" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Launchpad Burmese Translators
                    </a>
                    <a href="https://launchpad.net/~ubuntu-l10n-my" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Burmese Localization Team
                    </a>
                  </div>
                )}
                {mounted && lang === 'shn' && action.href === 'https://launchpad.net/' && (
                  <div className="mt-3 space-y-2 border-t border-[var(--border-light)] pt-3">
                    <a href="https://launchpad.net/~ubuntu-shn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Ubuntu Shan LoCo Team
                    </a>
                    <a href="https://launchpad.net/~lp-l10n-shn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Launchpad Shan Translators
                    </a>
                    <a href="https://launchpad.net/~ubuntu-l10n-shn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Ubuntu Shan Localization
                    </a>
                  </div>
                )}
                {mounted && lang === 'mnw' && action.href === 'https://launchpad.net/' && (
                  <div className="mt-3 space-y-2 border-t border-[var(--border-light)] pt-3">
                    <a href="https://launchpad.net/~lp-l10n-mnw" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Launchpad Mon Translation
                    </a>
                    <a href="https://launchpad.net/~ubuntu-l10n-mnw" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-ubuntu-orange hover:underline" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                      Ubuntu Mon Translation
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <Link key={action.href} href={action.href} className="glass-card glass-card-hover p-6 group">
                <action.icon className={`${action.iconColor} mb-3`} size={32} />
                <h3 className={`font-semibold text-[var(--tx-primary)] ${action.hoverColor} transition-colors`}>
                  {action.title}
                </h3>
                <p className="text-sm text-[var(--tx-secondary)] mt-1">{action.desc}</p>
              </Link>
            )
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--tx-primary)]">{t('dashboard_recent_activity', 'Recent Activity')}</h2>
          {recentActivity.length > 0 && (
            <Link href="/history" className="text-sm text-ubuntu-orange hover:underline flex items-center gap-1">
              {t('dashboard_view_all', 'View All')} <ArrowRight size={14} />
            </Link>
          )}
        </div>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="mx-auto text-[var(--tx-faint)] mb-2" size={32} />
              <p className="text-[var(--tx-muted)] text-sm">{t('dashboard_no_activity', 'No recent activity')}</p>
              <p className="text-[var(--tx-dim)] text-xs mt-1">{t('dashboard_no_activity_hint', 'Start translating to see your history here')}</p>
            </div>
          ) : (
            recentActivity.map((entry) => {
              const Icon = actionIconMap[entry.action] || Languages
              const color = actionColorMap[entry.action] || 'text-[var(--tx-muted)]'
              return (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-[var(--border-light)] last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${entry.action === 'translate' ? 'bg-ubuntu-orange/20' : entry.action === 'export' ? 'bg-emerald-400/20' : entry.action === 'upload' ? 'bg-blue-400/20' : 'bg-purple-400/20'}`}>
                      <Icon className={color} size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[var(--tx-primary)] text-sm truncate">{mounted && entry.descriptionKey ? ti(entry.descriptionKey, entry.descriptionParams || {}, entry.description) : entry.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--tx-dim)]">{entry.user}</span>
                        {entry.language && <span className="badge-orange text-[10px]">{entry.language}</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--tx-faint)] flex-shrink-0 ml-3">{formatTimestamp(entry.timestamp, t)}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Github className="text-[var(--tx-dim)]" size={32} />
          <div>
            <h3 className="font-semibold text-[var(--tx-primary)]">{t('dashboard_open_source', 'Open Source Project')}</h3>
            <p className="text-sm text-[var(--tx-secondary)]">{t('dashboard_contribute_cta', 'Contribute on GitHub — star, fork, and help translate Ubuntu')}</p>
          </div>
        </div>
        <a href="https://github.com/Wint-Theingi-Aung/ubuntu-localization" target="_blank" rel="noopener noreferrer" className="btn-outline flex items-center gap-2 text-sm">
          {t('dashboard_view_github', 'View on GitHub')}
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}
