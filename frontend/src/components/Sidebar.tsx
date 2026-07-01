'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileCode,
  Languages,
  BookOpen,
  BookMarked,
  Users,
  History,
  Menu,
  X,
  Github,
  ExternalLink,
  Globe,
} from 'lucide-react'
import TuxLogo from './TuxLogo'
import ThemeToggle from './ThemeToggle'
import { useI18n, type LanguageCode } from '@/lib/i18n'

function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    fetch('https://api.countapi.xyz/hit/ubuntu-localization/visits')
      .then(r => r.json())
      .then(d => setCount(d.value))
      .catch(() => {})
  }, [])
  return count !== null ? (
    <span className="text-[10px] text-[var(--tx-faint)]" title="Total visitors">
      👁 {count.toLocaleString()}
    </span>
  ) : null
}

const navItems = [
  { href: '/', labelKey: 'sidebar_dashboard', icon: LayoutDashboard, fallback: 'Dashboard' },
  { href: '/templates', labelKey: 'sidebar_templates', icon: FileCode, fallback: 'Templates' },
  { href: '/translate', labelKey: 'sidebar_translation', icon: Languages, fallback: 'Translation' },
  { href: '/glossary', labelKey: 'sidebar_glossary', icon: BookOpen, fallback: 'Glossary' },
  { href: '/guide', labelKey: 'sidebar_guide', icon: BookMarked, fallback: 'Guide' },
  { href: '/contributors', labelKey: 'sidebar_contributors', icon: Users, fallback: 'Contributors' },
  { href: '/history', labelKey: 'sidebar_history', icon: History, fallback: 'History' },
]

const uiLanguages: { code: LanguageCode; label: string; name: string; native: string }[] = [
  { code: 'my', label: 'MY', name: 'Myanmar', native: 'မြန်မာ' },
  { code: 'shn', label: 'SHN', name: 'Shan', native: 'ရှမ်း' },
  { code: 'mnw', label: 'MNW', name: 'Mon', native: 'မွန်' },
  { code: 'ksw', label: 'KSW', name: 'Karen', native: 'စကောကရင်' },
  { code: 'en', label: 'EN', name: 'English', native: 'English' },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { lang, setLang, t } = useI18n()
  const pathname = usePathname()

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-[var(--surface-overlay)] backdrop-blur-sm text-[var(--tx-primary)] hover:bg-[var(--surface-card-hover)] transition-colors border border-[var(--border-theme)]"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 sidebar-glass z-40 transform transition-transform duration-300 ease-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full sidebar-logo-bg">
          {/* Logo */}
          <div className="p-5 border-b border-[var(--border-theme)]">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <TuxLogo size={40} />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-ubuntu-orange rounded-full border-2 border-[var(--surface-sidebar)]" />
              </div>
              <div>
                <h1 className="font-bold text-[var(--tx-primary)] text-base group-hover:text-ubuntu-orange transition-colors">
                  Ubuntu
                </h1>
                <p className="text-[10px] text-[var(--tx-dim)] font-medium tracking-wider uppercase">
                  {t('app_title', 'Localization Tool')}
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] text-[var(--tx-faint)] font-semibold uppercase tracking-wider px-4 py-2">
              {t('sidebar_navigation', 'Navigation')}
            </p>
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`sidebar-link relative ${isActive ? 'active' : ''}`}
                >
                  <item.icon size={18} />
                  <span>{t(item.labelKey, item.fallback)}</span>
                </Link>
              )
            })}
          </nav>

          {/* Theme Toggle — icon only */}
          <div className="p-3 border-t border-[var(--border-theme)] flex justify-center">
            <ThemeToggle />
          </div>

          {/* Language Toggle */}
          <div className="p-3 border-t border-[var(--border-theme)]">
            <div className="flex items-center gap-2 px-4 py-2">
              <Globe size={14} className="text-[var(--tx-dim)]" />
              <p className="text-[10px] text-[var(--tx-faint)] font-semibold uppercase tracking-wider">
                {t('sidebar_interface_language', 'Interface Language')}
              </p>
            </div>
            <div className="px-3 flex flex-wrap gap-1.5">
              {uiLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => setLang(language.code)}
                  className={`lang-toggle-btn ${lang === language.code ? 'active' : ''}`}
                  title={`${language.name} (${language.native})`}
                >
                  {language.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[var(--border-theme)]">
            <a
              href="https://github.com/Wint-Theingi-Aung/ubuntu-localization"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-link text-xs"
            >
              <Github size={16} />
              <span>{t('sidebar_view_github', 'View on GitHub')}</span>
              <ExternalLink size={12} className="ml-auto opacity-40" />
            </a>
            <div className="mt-3 px-4 flex items-center justify-between">
              <p className="text-[10px] text-[var(--tx-faint)]">
                v3.1.0
              </p>
              <VisitorCounter />
              <p className="text-[10px] text-[var(--tx-faint)]">
                Next.js + Tailwind
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
