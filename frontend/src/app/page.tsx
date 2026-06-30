'use client'

import { useState } from 'react'
import LanguageCard from '@/components/LanguageCard'
import { Languages, FileCode, BookOpen, Users, ArrowRight, Sparkles, ExternalLink, Github } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

const languages = [
  { code: 'my', name: 'Myanmar', native: 'မြန်မာ', progress: 42, totalEntries: 48500, translatedEntries: 20370 },
  { code: 'shn', name: 'Shan', native: 'ရှမ်း', progress: 8, totalEntries: 48500, translatedEntries: 3880 },
  { code: 'mnw', name: 'Mon', native: 'မွန်', progress: 5, totalEntries: 48500, translatedEntries: 2425 },
  { code: 'ksw', name: 'S\'gaw Karen', native: 'စကောကရင်', progress: 3, totalEntries: 48500, translatedEntries: 1455 },
]

export default function Dashboard() {
  const [selectedLang, setSelectedLang] = useState<string | null>(null)
  const { t } = useI18n()

  const stats = [
    { label: t('dashboard_languages', 'Languages'), value: '4', icon: Languages, color: 'text-ubuntu-orange', bg: 'bg-ubuntu-orange/10' },
    { label: t('dashboard_templates', 'Templates'), value: '547', icon: FileCode, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: t('dashboard_glossary_terms', 'Glossary Terms'), value: '153', icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: t('dashboard_contributors', 'Contributors'), value: '161', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ]

  const quickActions = [
    { href: '/translate', icon: Languages, iconColor: 'text-ubuntu-orange', hoverColor: 'group-hover:text-ubuntu-orange', title: t('dashboard_ai_translation', 'AI Translation'), desc: t('dashboard_ai_desc', 'Upload .po files and translate with Gemini AI') },
    { href: '/templates', icon: FileCode, iconColor: 'text-purple-400', hoverColor: 'group-hover:text-purple-400', title: t('dashboard_browse_templates', 'Templates'), desc: t('dashboard_browse_desc', 'Browse 547 Ubuntu packages on Launchpad') },
    { href: '/glossary', icon: BookOpen, iconColor: 'text-emerald-400', hoverColor: 'group-hover:text-emerald-400', title: t('dashboard_glossary_action', 'Glossary'), desc: t('dashboard_glossary_desc', '153 standardized terms across 4 languages') },
    { href: '/guide', icon: BookOpen, iconColor: 'text-blue-400', hoverColor: 'group-hover:text-blue-400', title: t('dashboard_guide_action', 'Translation Guide'), desc: t('dashboard_guide_desc', 'Best practices for Ubuntu localization') },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{t('dashboard_title', 'Dashboard')}</h1>
            <Sparkles className="text-ubuntu-orange animate-pulse-slow" size={24} />
          </div>
          <p className="text-white/50 mt-1">{t('dashboard_subtitle', 'AI-powered Ubuntu localization for indigenous Myanmar languages')}</p>
        </div>
        <Link href="/translate" className="btn-primary flex items-center gap-2 w-fit">
          <Languages size={18} />
          {t('dashboard_start_translating', 'Start Translating')}
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-white/50">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">{t('dashboard_translation_progress', 'Translation Progress')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {languages.map((lang) => (
            <div key={lang.code} onClick={() => setSelectedLang(lang.code)}>
              <LanguageCard {...lang} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-white mb-4">{t('dashboard_quick_actions', 'Quick Actions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="glass-card-hover p-6 group">
              <action.icon className={`${action.iconColor} mb-3`} size={32} />
              <h3 className={`font-semibold text-white ${action.hoverColor} transition-colors`}>
                {action.title}
              </h3>
              <p className="text-sm text-white/50 mt-1">{action.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-white mb-4">{t('dashboard_recent_activity', 'Recent Activity')}</h2>
        <div className="space-y-3">
          {[
            { action: 'Translated 150 strings', lang: 'Myanmar', time: '2 hours ago', user: 'wint-theingi-aung' },
            { action: 'Exported gnome-control-center.po', lang: 'Myanmar', time: '3 hours ago', user: 'wint-theingi-aung' },
            { action: 'Added 25 glossary terms', lang: 'Shan', time: '1 day ago', user: 'gipsyhnh' },
            { action: 'Translated 8 strings in nautilus.po', lang: 'Mon', time: '1 day ago', user: 'htetminaung2018' },
          ].map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white text-sm">{activity.action}</p>
                <p className="text-xs text-white/40">{activity.user} • {activity.lang}</p>
              </div>
              <span className="text-xs text-white/30">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Github className="text-white/30" size={32} />
          <div>
            <h3 className="font-semibold text-white">{t('dashboard_open_source', 'Open Source Project')}</h3>
            <p className="text-sm text-white/40">{t('dashboard_contribute_cta', 'Contribute on GitHub — star, fork, and help translate Ubuntu')}</p>
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
