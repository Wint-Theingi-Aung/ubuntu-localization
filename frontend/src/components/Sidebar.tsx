'use client'

import { useState } from 'react'
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

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/templates', label: 'Templates', icon: FileCode },
  { href: '/translate', label: 'Translation', icon: Languages },
  { href: '/glossary', label: 'Glossary', icon: BookOpen },
  { href: '/guide', label: 'Guide', icon: BookMarked },
  { href: '/contributors', label: 'Contributors', icon: Users },
  { href: '/history', label: 'History', icon: History },
]

const uiLanguages = [
  { code: 'my', label: 'MY', name: 'Myanmar', native: 'မြန်မာ' },
  { code: 'shn', label: 'SHN', name: 'Shan', native: 'ရှမ်း' },
  { code: 'mnw', label: 'MNW', name: 'Mon', native: 'မွန်' },
  { code: 'ksw', label: 'KSW', name: 'Karen', native: 'စကောကရင်' },
  { code: 'en', label: 'EN', name: 'English', native: 'English' },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [uiLang, setUiLang] = useState('en')
  const pathname = usePathname()

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white/[0.06] backdrop-blur-sm text-white hover:bg-white/[0.12] transition-colors border border-white/[0.08]"
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
        className={`fixed top-0 left-0 h-full w-64 bg-[#1a0512]/95 backdrop-blur-xl border-r border-white/[0.06] z-40 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-5 border-b border-white/[0.06]">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <TuxLogo size={40} />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-ubuntu-orange rounded-full border-2 border-[#1a0512]" />
              </div>
              <div>
                <h1 className="font-bold text-white text-base group-hover:text-ubuntu-orange transition-colors">
                  Ubuntu
                </h1>
                <p className="text-[10px] text-white/30 font-medium tracking-wider uppercase">
                  Localization Tool
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] text-white/20 font-semibold uppercase tracking-wider px-4 py-2">
              Navigation
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
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Language Toggle */}
          <div className="p-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 px-4 py-2">
              <Globe size={14} className="text-white/30" />
              <p className="text-[10px] text-white/20 font-semibold uppercase tracking-wider">
                Interface Language
              </p>
            </div>
            <div className="px-3 flex flex-wrap gap-1.5">
              {uiLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setUiLang(lang.code)}
                  className={`lang-toggle-btn ${uiLang === lang.code ? 'active' : ''}`}
                  title={`${lang.name} (${lang.native})`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/[0.06]">
            <a
              href="https://github.com/Wint-Theingi-Aung/ubuntu-localization"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-link text-xs"
            >
              <Github size={16} />
              <span>View on GitHub</span>
              <ExternalLink size={12} className="ml-auto opacity-40" />
            </a>
            <div className="mt-3 px-4 flex items-center justify-between">
              <p className="text-[10px] text-white/20">
                v3.0.0
              </p>
              <p className="text-[10px] text-white/20">
                Next.js + Tailwind
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
