'use client'

import { useState } from 'react'
import { ChevronRight, BookOpen, Upload, Languages, FileText, AlertTriangle, CheckCircle2, Code2, Lightbulb, Globe, Users, Heart, Zap, Shield, ClipboardCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import guideData from '@/data/guide.json'

// Map section IDs to icons
const sectionIcons: Record<string, typeof BookOpen> = {
  overview: Globe,
  prerequisites: ClipboardCheck,
  'quick-start': Upload,
  placeholders: Code2,
  'html-tags': Code2,
  'technical-terms': AlertTriangle,
  gemini: Languages,
  qa: Shield,
  'glossary-usage': BookOpen,
  community: Users,
}

// Map chapter IDs to icons
const chapterIcons: Record<string, typeof BookOpen> = {
  'getting-started': BookOpen,
  'translation-guide': Languages,
  'ai-features': Zap,
  contributing: Heart,
}

type LangCode = 'en' | 'my' | 'shn' | 'mnw' | 'ksw'

interface Section {
  id: string
  title: string
  content: string
  tips?: string[]
}

interface Chapter {
  id: string
  title: string
  sectionCount: number
  sections: Section[]
}

export default function GuidePage() {
  const { lang, t } = useI18n()
  const [openChapter, setOpenChapter] = useState<string | null>('getting-started')
  const [openSection, setOpenSection] = useState<string | null>('overview')

  // Get chapters for current language, fallback to English
  const langData = (guideData as Record<string, { chapters: Chapter[] }>)[lang] || guideData.en
  const chapters = langData.chapters

  const toggleChapter = (id: string) => {
    if (openChapter === id) {
      setOpenChapter(null)
      setOpenSection(null)
    } else {
      setOpenChapter(id)
      const ch = chapters.find((c) => c.id === id)
      setOpenSection(ch?.sections[0]?.id || null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('guide_title', 'Guide')}</h1>
        <p className="text-[var(--tx-muted)] mt-1">{t('guide_subtitle', 'Everything you need to know about translating Ubuntu')}</p>
      </div>

      {/* Chapter tabs */}
      <div className="flex gap-2 flex-wrap">
        {chapters.map((ch, idx) => {
          const active = openChapter === ch.id
          return (
            <button
              key={ch.id}
              onClick={() => toggleChapter(ch.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                active
                  ? 'bg-ubuntu-orange/20 text-ubuntu-orange border border-ubuntu-orange/30'
                  : 'bg-[var(--surface-overlay)] text-[var(--tx-dim)] border border-[var(--border-light)] hover:text-[var(--tx-muted)]'
              }`}
            >
              <span className="w-5 h-5 rounded-md bg-[var(--surface-overlay)] flex items-center justify-center text-[10px] font-bold">
                {idx + 1}
              </span>
              {ch.title}
            </button>
          )
        })}
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        {chapters.map((ch) => {
          const isOpen = openChapter === ch.id
          const Icon = chapterIcons[ch.id] || BookOpen
          return (
            <div key={ch.id} className="glass-card chapter-card overflow-hidden">
              <button onClick={() => toggleChapter(ch.id)} className="accordion-header" aria-expanded={isOpen}>
                <div className="flex items-center gap-3">
                  <div className={`chapter-icon-box ${isOpen ? 'active' : ''}`}>
                    <Icon size={20} />
                  </div>
                  <div className="text-left">
                    <h2 className="font-semibold text-[var(--tx-primary)] text-sm">{ch.title}</h2>
                    <p className="text-[11px] text-[var(--tx-dim)] mt-0.5">
                      {ch.sectionCount} {t('guide_sections', 'sections')}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="accordion-arrow" />
              </button>

              {isOpen && (
                <div className="border-t border-[var(--border-light)] animate-fade-in">
                  {ch.sections.map((sec) => {
                    const secOpen = openSection === sec.id
                    const SecIcon = sectionIcons[sec.id] || BookOpen
                    return (
                      <div key={sec.id}>
                        <button
                          onClick={() => setOpenSection(secOpen ? null : sec.id)}
                          className="section-item"
                          aria-expanded={secOpen}
                        >
                          <SecIcon
                            size={16}
                            className={`section-icon ${secOpen ? 'text-ubuntu-orange' : 'text-[var(--tx-dim)]'}`}
                          />
                          <span
                            className={`text-sm flex-1 ${
                              secOpen ? 'text-[var(--tx-primary)] font-medium' : 'text-[var(--tx-muted)]'
                            }`}
                          >
                            {sec.title}
                          </span>
                          <ChevronRight size={14} className={`accordion-arrow ${secOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {secOpen && (
                          <div className="px-5 pb-5 ml-8 animate-fade-in">
                            <p className="text-[var(--tx-secondary)] text-sm leading-relaxed mb-4">{sec.content}</p>
                            {sec.tips && sec.tips.length > 0 && (
                              <div className="tips-box">
                                <div className="flex items-center gap-2 mb-3">
                                  <Lightbulb size={14} className="text-amber-400" />
                                  <span className="text-xs font-semibold text-[var(--tx-muted)] uppercase tracking-wider">
                                    {t('guide_key_points', 'Key Points')}
                                  </span>
                                </div>
                                <ul className="space-y-1.5">
                                  {sec.tips.map((tip, i) => (
                                    <li key={i} className="tip-item">
                                      <span className="tip-bullet">●</span>
                                      <span className="font-mono text-xs text-[var(--tx-secondary)]">{tip}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Reference Card link */}
      <div className="glass-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <FileText size={20} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--tx-primary)]">{t('guide_quick_ref', 'Quick Reference Card')}</p>
            <p className="text-xs text-[var(--tx-dim)]">{t('guide_quick_ref_desc', 'Printable cheat sheet for translators')}</p>
          </div>
        </div>
        <a href="/guide/quickref" className="btn-secondary text-sm py-2 px-4">
          {t('guide_view_card', 'View Card')}
        </a>
      </div>
    </div>
  )
}
