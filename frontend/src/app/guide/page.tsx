'use client'

import { useState } from 'react'
import { ChevronRight, BookOpen, Upload, Languages, FileText, AlertTriangle, CheckCircle2, Code2, Lightbulb, Globe, Users, Heart, Zap, Shield } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Section { id: string; title: string; icon: typeof BookOpen; content: string; tips?: string[] }
interface Chapter { id: string; title: string; icon: typeof BookOpen; sectionCount: number; sections: Section[] }

const chapters: Chapter[] = [
  { id: 'getting-started', title: 'Getting Started', icon: BookOpen, sectionCount: 2, sections: [
    { id: 'overview', title: 'What is Ubuntu Localization?', icon: Globe, content: "The Ubuntu Localization Tool helps translate Ubuntu into indigenous languages using AI. It supports Myanmar (Burmese), Shan, Mon, and S'gaw Karen.", tips: ['Ubuntu uses Launchpad for translations', '.po files contain translatable strings', 'Each string has a source (English) and target'] },
    { id: 'quick-start', title: 'Quick Start Guide', icon: Upload, content: 'Follow these steps to start translating Ubuntu into your language.', tips: ['1. Go to the Translation page', '2. Upload a .po file from Launchpad', '3. Select your target language', '4. Click AI Translate', '5. Review and edit translations', '6. Export the translated .po file', '7. Upload back to Launchpad'] },
  ]},
  { id: 'translation-guide', title: 'Translation Rules', icon: Languages, sectionCount: 3, sections: [
    { id: 'placeholders', title: 'Preserving Placeholders', icon: Code2, content: 'Placeholders must be preserved exactly in your translation.', tips: ['%s — string placeholder', '%d — integer placeholder', '%f — float placeholder', '%(name)s — named placeholder', '{0}, {1} — positional placeholders'] },
    { id: 'html-tags', title: 'Preserving HTML Tags', icon: Code2, content: 'HTML/XML tags in source strings must be preserved exactly.', tips: ['<b>bold text</b> — keep tags', '<i>italic text</i> — preserve structure', '<a href="...">link</a> — keep href', '&amp; &lt; &gt; — HTML entities'] },
    { id: 'technical-terms', title: 'Technical Terms (Do NOT Translate)', icon: AlertTriangle, content: 'These terms should remain in English across all languages.', tips: ['Brands: Ubuntu, Canonical, Debian, Firefox', 'System: Kernel, GRUB, systemd, dbus', 'Tools: sudo, apt, dpkg, snap, flatpak', 'Network: SSH, VPN, TCP, UDP, DNS, HTTP', 'Storage: ext4, Btrfs, LVM, RAID'] },
  ]},
  { id: 'ai-features', title: 'AI Translation', icon: Zap, sectionCount: 2, sections: [
    { id: 'gemini', title: 'How AI Translation Works', icon: Languages, content: "The tool uses Google Gemini 2.5 Flash to generate translations optimized for Ubuntu-specific terminology.", tips: ['AI translates batches of 15 strings at a time', 'QA-verified for placeholder integrity', 'Manually edit any AI-generated translation', 'Rate limits: 15 requests/min on free tier'] },
    { id: 'qa', title: 'QA Verification', icon: Shield, content: 'Every translation is automatically verified for quality.', tips: ['Placeholder check — %s, %d, {0} preserved', 'Newline count — matching source', 'Non-empty — translation must not be blank', 'Length ratio — 0.3x to 4.0x of source'] },
  ]},
  { id: 'contributing', title: 'Contributing', icon: Heart, sectionCount: 2, sections: [
    { id: 'glossary-usage', title: 'Using the Glossary', icon: BookOpen, content: 'The Glossary page provides standardized translations for common Ubuntu terms.', tips: ['Check Glossary before translating common terms', 'Consistent terminology improves UX', 'Shan and Mon terms already available', 'Contributions welcome via GitHub'] },
    { id: 'community', title: 'Join the Community', icon: Users, content: 'Ubuntu translation is a community effort.', tips: ['Launchpad: translations.launchpad.net/ubuntu', 'Team: Ubuntu Translators', 'Mailing list: ubuntu-translators@lists.ubuntu.com', 'GitHub: Wint-Theingi-Aung/ubuntu-localization'] },
  ]},
]

export default function GuidePage() {
  const { t } = useI18n()
  const [openChapter, setOpenChapter] = useState<string | null>('getting-started')
  const [openSection, setOpenSection] = useState<string | null>('overview')

  const toggleChapter = (id: string) => {
    if (openChapter === id) { setOpenChapter(null); setOpenSection(null) }
    else { setOpenChapter(id); const ch = chapters.find(c => c.id === id); setOpenSection(ch?.sections[0]?.id || null) }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('guide_title', 'Guide')}</h1>
        <p className="text-[var(--tx-muted)] mt-1">{t('guide_subtitle', 'Everything you need to know about translating Ubuntu')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {chapters.map((ch, idx) => {
          const active = openChapter === ch.id
          return (
            <button key={ch.id} onClick={() => toggleChapter(ch.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${active ? 'bg-ubuntu-orange/20 text-ubuntu-orange border border-ubuntu-orange/30' : 'bg-[var(--surface-overlay)] text-[var(--tx-dim)] border border-[var(--border-light)] hover:text-[var(--tx-muted)]'}`}>
              <span className="w-5 h-5 rounded-md bg-[var(--surface-overlay)] flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
              {ch.title}
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {chapters.map(ch => {
          const isOpen = openChapter === ch.id; const Icon = ch.icon
          return (
            <div key={ch.id} className="glass-card chapter-card overflow-hidden">
              <button onClick={() => toggleChapter(ch.id)} className="accordion-header" aria-expanded={isOpen}>
                <div className="flex items-center gap-3">
                  <div className={`chapter-icon-box ${isOpen ? 'active' : ''}`}><Icon size={20} /></div>
                  <div className="text-left">
                    <h2 className="font-semibold text-[var(--tx-primary)] text-sm">{ch.title}</h2>
                    <p className="text-[11px] text-[var(--tx-dim)] mt-0.5">{ch.sectionCount} {t('guide_sections', 'sections')}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="accordion-arrow" />
              </button>
              {isOpen && (
                <div className="border-t border-[var(--border-light)] animate-fade-in">
                  {ch.sections.map(sec => {
                    const secOpen = openSection === sec.id; const SecIcon = sec.icon
                    return (
                      <div key={sec.id}>
                        <button onClick={() => setOpenSection(secOpen ? null : sec.id)} className="section-item" aria-expanded={secOpen}>
                          <SecIcon size={16} className={`section-icon ${secOpen ? 'text-ubuntu-orange' : 'text-[var(--tx-dim)]'}`} />
                          <span className={`text-sm flex-1 ${secOpen ? 'text-[var(--tx-primary)] font-medium' : 'text-[var(--tx-muted)]'}`}>{sec.title}</span>
                          <ChevronRight size={14} className={`accordion-arrow ${secOpen ? 'rotate-90' : ''}`} />
                        </button>
                        {secOpen && (
                          <div className="px-5 pb-5 ml-8 animate-fade-in">
                            <p className="text-[var(--tx-secondary)] text-sm leading-relaxed mb-4">{sec.content}</p>
                            {sec.tips && (
                              <div className="tips-box">
                                <div className="flex items-center gap-2 mb-3">
                                  <Lightbulb size={14} className="text-amber-400" />
                                  <span className="text-xs font-semibold text-[var(--tx-muted)] uppercase tracking-wider">{t('guide_key_points', 'Key Points')}</span>
                                </div>
                                <ul className="space-y-1.5">
                                  {sec.tips.map((tip, i) => (
                                    <li key={i} className="tip-item"><span className="tip-bullet">●</span><span className="font-mono text-xs text-[var(--tx-secondary)]">{tip}</span></li>
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

      <div className="glass-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center"><FileText size={20} className="text-purple-400" /></div>
          <div>
            <p className="text-sm font-medium text-[var(--tx-primary)]">{t('guide_quick_ref', 'Quick Reference Card')}</p>
            <p className="text-xs text-[var(--tx-dim)]">{t('guide_quick_ref_desc', 'Printable cheat sheet for translators')}</p>
          </div>
        </div>
        <a href="/guide/quickref" className="btn-secondary text-sm py-2 px-4">{t('guide_view_card', 'View Card')}</a>
      </div>
    </div>
  )
}
