'use client'

import { useState } from 'react'
import {
  ChevronRight, BookOpen, Upload, Languages, Download, FileText,
  AlertTriangle, CheckCircle2, Code2, Lightbulb, Globe, Users, Heart, Zap, Shield,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Section {
  id: string; title: string; icon: typeof BookOpen; content: string; tips?: string[]
}
interface Chapter {
  id: string; title: string; icon: typeof BookOpen; sectionCount: number; sections: Section[]
}

const chapters: Chapter[] = [
  { id: 'getting-started', title: 'Getting Started', icon: BookOpen, sectionCount: 2, sections: [
    { id: 'overview', title: 'What is Ubuntu Localization?', icon: Globe, content: 'The Ubuntu Localization Tool helps translate Ubuntu into indigenous languages using AI. It supports Myanmar (Burmese), Shan, Mon, and S\'gaw Karen. The tool uses Google Gemini AI to translate .po files — the standard format used by GNU gettext for software localization.', tips: ['Ubuntu uses Launchpad for translations', '.po files contain translatable strings extracted from source code', 'Each string has a source (English) and target (your language)'] },
    { id: 'quick-start', title: 'Quick Start Guide', icon: Upload, content: 'Follow these steps to start translating Ubuntu into your language.', tips: ['1. Go to the Translation page', '2. Upload a .po file from Launchpad (or use the demo)', '3. Select your target language (Myanmar, Shan, Mon, or Karen)', '4. Click "AI Translate" to generate translations', '5. Review and edit translations as needed', '6. Export the translated .po file', '7. Upload the translated file back to Launchpad'] },
  ]},
  { id: 'translation-guide', title: 'Translation Rules', icon: Languages, sectionCount: 3, sections: [
    { id: 'placeholders', title: 'Preserving Placeholders', icon: Code2, content: 'Placeholders are special tokens that get replaced with dynamic values at runtime. They MUST be preserved exactly in your translation.', tips: ['%s — string placeholder (e.g., "File %s saved")', '%d — integer placeholder (e.g., "%d files found")', '%f — float placeholder (e.g., "%.2f GB")', '%(name)s — named placeholder (e.g., "%(user)s logged in")', '{0}, {1} — positional placeholders'] },
    { id: 'html-tags', title: 'Preserving HTML Tags', icon: Code2, content: 'HTML/XML tags in source strings must be preserved exactly.', tips: ['<b>bold text</b> — keep tags around equivalent text', '<i>italic text</i> — preserve tag structure', '<a href="...">link</a> — keep href, translate link text', '&amp; &lt; &gt; — HTML entities must be preserved'] },
    { id: 'technical-terms', title: 'Technical Terms (Do NOT Translate)', icon: AlertTriangle, content: 'These terms should remain in English across all languages.', tips: ['Brands: Ubuntu, Canonical, Debian, Firefox, LibreOffice, GNOME', 'System: Kernel, GRUB, systemd, dbus, X11, Wayland', 'Tools: sudo, apt, dpkg, snap, flatpak', 'Network: SSH, VPN, TCP, UDP, DNS, DHCP, HTTP', 'Storage: ext4, Btrfs, LVM, RAID, SSD, HDD', 'Audio: PulseAudio, PipeWire, ALSA', 'Security: AppArmor, SELinux, Firewall'] },
  ]},
  { id: 'ai-features', title: 'AI Translation', icon: Zap, sectionCount: 2, sections: [
    { id: 'gemini', title: 'How AI Translation Works', icon: Languages, content: 'The tool uses Google Gemini 2.5 Flash to generate translations. It\'s optimized for Ubuntu-specific terminology.', tips: ['AI translates batches of 15 strings at a time', 'Each translation is QA-verified for placeholder integrity', 'You can manually edit any AI-generated translation', 'Rate limits apply (15 requests per minute on free tier)'] },
    { id: 'qa', title: 'QA Verification', icon: Shield, content: 'Every translation is automatically verified for quality.', tips: ['Placeholder check — all %s, %d, {0} preserved', 'Newline count — matching source string', 'Non-empty — translation must not be blank', 'Length ratio — 0.3x to 4.0x of source length'] },
  ]},
  { id: 'contributing', title: 'Contributing', icon: Heart, sectionCount: 2, sections: [
    { id: 'glossary-usage', title: 'Using the Glossary', icon: BookOpen, content: 'The Glossary page provides standardized translations for common Ubuntu terms.', tips: ['Check the Glossary before translating common terms', 'Consistent terminology improves user experience', 'Some terms have translations for Shan and Mon already', 'Contributions to the glossary are welcome via GitHub'] },
    { id: 'community', title: 'Join the Community', icon: Users, content: 'Ubuntu translation is a community effort.', tips: ['Launchpad: translations.launchpad.net/ubuntu', 'Team: Ubuntu Translators (ubuntu-translators)', 'Mailing list: ubuntu-translators@lists.ubuntu.com', 'GitHub: Wint-Theingi-Aung/ubuntu-localization'] },
  ]},
]

export default function GuidePage() {
  const { t } = useI18n()
  const [openChapter, setOpenChapter] = useState<string | null>('getting-started')
  const [openSection, setOpenSection] = useState<string | null>('overview')

  const toggleChapter = (chapterId: string) => {
    if (openChapter === chapterId) { setOpenChapter(null); setOpenSection(null) }
    else { setOpenChapter(chapterId); const chapter = chapters.find(c => c.id === chapterId); setOpenSection(chapter?.sections[0]?.id || null) }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">{t('guide_title', 'Guide')}</h1>
        <p className="text-white/50 mt-1">{t('guide_subtitle', 'Everything you need to know about translating Ubuntu')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {chapters.map((chapter, idx) => {
          const isActive = openChapter === chapter.id
          return (
            <button key={chapter.id} onClick={() => toggleChapter(chapter.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${isActive ? 'bg-ubuntu-orange/20 text-ubuntu-orange border border-ubuntu-orange/30' : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'}`}>
              <span className="w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
              {chapter.title}
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {chapters.map((chapter) => {
          const isChapterOpen = openChapter === chapter.id
          const ChapterIcon = chapter.icon
          return (
            <div key={chapter.id} className="chapter-card">
              <button onClick={() => toggleChapter(chapter.id)} className="accordion-header group" aria-expanded={isChapterOpen}>
                <div className="flex items-center gap-3">
                  <div className={`chapter-icon-box ${isChapterOpen ? 'active' : ''}`}><ChapterIcon size={20} /></div>
                  <div className="text-left">
                    <h2 className="font-semibold text-white text-sm group-hover:text-ubuntu-orange transition-colors">{chapter.title}</h2>
                    <p className="text-[11px] text-white/30 mt-0.5">{chapter.sectionCount} {t('guide_sections', 'sections')}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="accordion-arrow" />
              </button>
              {isChapterOpen && (
                <div className="border-t border-white/[0.06] animate-fade-in">
                  {chapter.sections.map((section) => {
                    const isSectionOpen = openSection === section.id
                    const SectionIcon = section.icon
                    return (
                      <div key={section.id}>
                        <button onClick={() => setOpenSection(isSectionOpen ? null : section.id)}
                          className="section-item group" aria-expanded={isSectionOpen}>
                          <SectionIcon size={16} className={`section-icon ${isSectionOpen ? 'text-ubuntu-orange' : 'text-white/30'}`} />
                          <span className={`text-sm flex-1 ${isSectionOpen ? 'text-white font-medium' : 'text-white/50 group-hover:text-white/70'}`}>{section.title}</span>
                          <ChevronRight size={14} className={`accordion-arrow ${isSectionOpen ? 'rotate-90' : ''}`} />
                        </button>
                        {isSectionOpen && (
                          <div className="px-5 pb-5 ml-8 animate-fade-in">
                            <p className="text-white/70 text-sm leading-relaxed mb-4">{section.content}</p>
                            {section.tips && (
                              <div className="tips-box">
                                <div className="flex items-center gap-2 mb-3">
                                  <Lightbulb size={14} className="text-amber-400" />
                                  <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">{t('guide_key_points', 'Key Points')}</span>
                                </div>
                                <ul className="space-y-1.5">
                                  {section.tips.map((tip, i) => (
                                    <li key={i} className="tip-item"><span className="tip-bullet">●</span><span className="font-mono text-xs">{tip}</span></li>
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
            <p className="text-sm font-medium text-white">{t('guide_quick_ref', 'Quick Reference Card')}</p>
            <p className="text-xs text-white/30">{t('guide_quick_ref_desc', 'Printable cheat sheet for translators')}</p>
          </div>
        </div>
        <a href="/guide/quickref" className="btn-secondary text-sm py-2 px-4">{t('guide_view_card', 'View Card')}</a>
      </div>
    </div>
  )
}
