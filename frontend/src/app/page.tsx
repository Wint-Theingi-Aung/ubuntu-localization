'use client'
import { useState, useEffect } from 'react'
import LanguageCard from '@/components/LanguageCard'
import { Languages, FileCode, BookOpen, Users, ArrowRight, Sparkles, ExternalLink, Github, Rocket } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { LANGUAGES, TRANSLATION_STATS, DASHBOARD_STATS, lpLanguageUrl } from '@/lib/constants'

export default function Dashboard() {
  const { t, lang } = useI18n()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const languageData = LANGUAGES.map(lang => {
    const stats = TRANSLATION_STATS.find(s => s.code === lang.code)!
    return {
      ...lang,
      ...stats,
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

  const recentActivity = [
    { actionKey: 'history_activity_translated', count: 150, fileKey: 'gnome-control-center.po', lang: 'Myanmar', timeKey: 'history_time_hours_ago', timeValue: 2, user: 'wint-theingi-aung' },
    { actionKey: 'history_activity_exported', fileKey: 'gnome-control-center.po', lang: 'Myanmar', timeKey: 'history_time_hours_ago', timeValue: 3, user: 'wint-theingi-aung' },
    { actionKey: 'history_activity_added', count: 25, glossaryKey: 'history_activity_glossary_terms', lang: 'Shan', timeKey: 'history_time_days_ago', timeValue: 1, user: 'gipsyhnh' },
    { actionKey: 'history_activity_translated', count: 8, fileKey: 'nautilus.po', lang: 'Mon', timeKey: 'history_time_days_ago', timeValue: 1, user: 'htetminaung2018' },
  ]

  const formatActivity = (activity: typeof recentActivity[0]) => {
    const action = t(activity.actionKey, activity.actionKey === 'history_activity_translated' ? 'Translated' : activity.actionKey === 'history_activity_exported' ? 'Exported' : 'Added')
    if (activity.actionKey === 'history_activity_exported') {
      return `${action} ${activity.fileKey}`
    }
    if (activity.actionKey === 'history_activity_added') {
      const glossary = t(activity.glossaryKey || 'history_activity_glossary_terms', 'glossary terms')
      return `${action} ${activity.count} ${glossary}`
    }
    const strings = t('history_activity_strings', 'strings in')
    return `${action} ${activity.count} ${strings} ${activity.fileKey}`
  }

  const formatTime = (activity: typeof recentActivity[0]) => {
    const timeLabel = t(activity.timeKey, activity.timeKey === 'history_time_hours_ago' ? 'h ago' : 'd ago')
    return `${activity.timeValue}${timeLabel}`
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('dashboard_title', 'Dashboard')}</h1>
            <Sparkles className="text-ubuntu-orange animate-pulse-slow" size={24} />
          </div>
          <p className="text-[var(--tx-secondary)] mt-1">{t('dashboard_subtitle', 'AI-powered Ubuntu localization for indigenous Myanmar languages')}</p>
        </div>
        <Link href="/translate" className="btn-primary flex items-center gap-2 w-fit">
          <Languages size={18} />
          {t('dashboard_start_translating', 'Start Translating')}
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
        <h2 className="text-xl font-semibold text-[var(--tx-primary)] mb-4">{t('dashboard_translation_progress', 'Translation Progress')}</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            action.external ? (
              <a key={action.href} href={action.href} target="_blank" rel="noopener noreferrer" className="glass-card glass-card-hover p-6 group">
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
              </a>
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
        <h2 className="text-xl font-semibold text-[var(--tx-primary)] mb-4">{t('dashboard_recent_activity', 'Recent Activity')}</h2>
        <div className="space-y-3">
          {recentActivity.map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--border-light)] last:border-0">
              <div>
                <p className="text-[var(--tx-primary)] text-sm">{formatActivity(activity)}</p>
                <p className="text-xs text-[var(--tx-dim)]">{activity.user} • {activity.lang}</p>
              </div>
              <span className="text-xs text-[var(--tx-faint)]">{formatTime(activity)}</span>
            </div>
          ))}
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
