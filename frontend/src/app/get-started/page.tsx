'use client'

import { UserPlus, LogIn, Users, BookOpen, Languages, Download, UploadCloud, ArrowRight, ExternalLink, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

const steps = [
  {
    number: 1,
    icon: UserPlus,
    color: 'text-ubuntu-orange',
    bg: 'bg-ubuntu-orange/10',
    titleKey: 'get_started_step1_title',
    titleFallback: 'Create Ubuntu One Account',
    descKey: 'get_started_step1_desc',
    descFallback: 'Sign up for a free Ubuntu One account to access Launchpad and other Ubuntu services.',
    link: 'https://login.ubuntu.com/',
    linkText: 'Create Account',
    external: true,
  },
  {
    number: 2,
    icon: LogIn,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    titleKey: 'get_started_step2_title',
    titleFallback: 'Sign In to Launchpad',
    descKey: 'get_started_step2_desc',
    descFallback: 'Use your Ubuntu One credentials to sign in to Launchpad, the collaboration platform for Ubuntu.',
    link: 'https://launchpad.net/+login',
    linkText: 'Sign In',
    external: true,
  },
  {
    number: 3,
    icon: Download,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    titleKey: 'get_started_step3_title',
    titleFallback: 'Download Translation Template',
    descKey: 'get_started_step3_desc',
    descFallback: 'Open the Templates page and select your language. Find the template you want to translate and open it in Launchpad. Click Download Translation. Launchpad will send a notification email containing the translation file. Open the email and download the attached .po file.',
    link: '/templates',
    linkText: 'Browse Templates',
    external: false,
  },
  {
    number: 4,
    icon: BookOpen,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    titleKey: 'get_started_step4_title',
    titleFallback: 'Read Translation Guide',
    descKey: 'get_started_step4_desc',
    descFallback: 'Learn best practices for translating Ubuntu, including handling placeholders, HTML tags, and technical terms.',
    link: '/guide',
    linkText: 'Read Guide',
    external: false,
  },
  {
    number: 5,
    icon: Languages,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    titleKey: 'get_started_step5_title',
    titleFallback: 'Start Translating',
    descKey: 'get_started_step5_desc',
    descFallback: 'Use our AI-powered translation tool to upload .po files and translate Ubuntu into your language.',
    link: '/translate',
    linkText: 'Start Now',
    external: false,
  },
  {
    number: 6,
    icon: UploadCloud,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    titleKey: 'get_started_step6_title',
    titleFallback: 'Upload Your Translation',
    descKey: 'get_started_step6_desc',
    descFallback: 'After translating the .po file, return to the same template in Launchpad. Click Upload Translation and upload your translated .po file. After a successful upload, Launchpad will send a confirmation email indicating that your translation has been received and is ready for review.',
    link: 'https://launchpad.net/+login',
    linkText: 'Go to Launchpad',
    external: true,
  },
]

export default function GetStartedPage() {
  const { t } = useI18n()

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--tx-primary)]">{t('get_started_title', 'Get Started')}</h1>
        <p className="text-[var(--tx-muted)] mt-1">{t('get_started_subtitle', 'Follow these steps to start contributing to Ubuntu translations')}</p>
      </div>

      {/* Progress indicator */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.number} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step.bg} ${step.color}`}>
                {step.number}
              </div>
              {idx < steps.length - 1 && (
                <div className="hidden sm:block w-8 h-0.5 bg-[var(--border-light)] mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.number} className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center flex-shrink-0`}>
                <step.icon className={step.color} size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${step.color}`}>{t('get_started_step', 'Step')} {step.number}</span>
                </div>
                <h3 className="text-lg font-semibold text-[var(--tx-primary)] mb-2">
                  {t(step.titleKey, step.titleFallback)}
                </h3>
                <p className="text-sm text-[var(--tx-secondary)] mb-4 text-justify">
                  {t(step.descKey, step.descFallback)}
                </p>
                {step.external ? (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-ubuntu-orange hover:text-ubuntu-orange/80 transition-colors"
                  >
                    {step.linkText}
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <Link
                    href={step.link}
                    className="inline-flex items-center gap-2 text-sm font-medium text-ubuntu-orange hover:text-ubuntu-orange/80 transition-colors"
                  >
                    {step.linkText}
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success message */}
      <div className="glass-card p-6 border-l-4 border-emerald-500/50">
        <div className="flex gap-3">
          <CheckCircle2 className="text-emerald-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-[var(--tx-secondary)] font-medium">{t('get_started_ready', 'Ready to Contribute')}</p>
            <p className="text-xs text-[var(--tx-muted)] mt-1">{t('get_started_ready_desc', 'Once you complete these steps, you can start translating Ubuntu into your language. Every translation helps make Ubuntu accessible to more people. After translating, don\'t forget to upload your .po file back to Launchpad for review.')}</p>
          </div>
        </div>
      </div>

      {/* CTA to Translation Guide */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <BookOpen size={20} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--tx-primary)]">{t('get_started_cta_title', 'Need Translation Guidelines?')}</p>
            <p className="text-xs text-[var(--tx-dim)]">{t('get_started_cta_desc', 'Before you start translating, please read the Translation Guide to understand Ubuntu translation conventions, terminology, and best practices.')}</p>
          </div>
        </div>
        <Link href="/guide" className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 whitespace-nowrap">
          {t('get_started_cta_button', 'Open Translation Guide')}
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
