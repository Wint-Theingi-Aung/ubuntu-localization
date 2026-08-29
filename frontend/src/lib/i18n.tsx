'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import en from '@/data/i18n/en.json'
import my from '@/data/i18n/my.json'
import shn from '@/data/i18n/shn.json'
import mnw from '@/data/i18n/mnw.json'
import ksw from '@/data/i18n/ksw.json'

type LanguageCode = 'en' | 'my' | 'shn' | 'mnw' | 'ksw'

interface I18nContextType {
  lang: LanguageCode
  setLang: (lang: LanguageCode) => void
  t: (key: string, fallback?: string) => string
  ti: (key: string, params: Record<string, string | number>, fallback?: string) => string
  langName: string
}

const I18nContext = createContext<I18nContextType | null>(null)

const translations: Record<string, Record<string, string>> = { en, my, shn, mnw, ksw }
const langNames: Record<string, string> = {
  en: 'English',
  my: 'ဗမာ',
  shn: 'တႆး',
  mnw: 'မန်',
  ksw: 'စှီၤကရိ',
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Start with 'en' so server and client match during hydration.
  // After hydration, useEffect reads the saved preference from localStorage.
  const [lang, setLangState] = useState<LanguageCode>('en')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ubuntu-locale')
      if (stored && ['en', 'my', 'shn', 'mnw', 'ksw'].includes(stored)) {
        setLangState(stored as LanguageCode)
      }
    } catch {}
  }, [])

  const setLang = useCallback((newLang: LanguageCode) => {
    setLangState(newLang)
    localStorage.setItem('ubuntu-locale', newLang)
  }, [])

  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (lang === 'en') return fallback || key
      return translations[lang]?.[key] || translations['en']?.[key] || fallback || key
    },
    [lang]
  )

  /** Translate with interpolation — replaces {param} placeholders in the resolved string */
  const ti = useCallback(
    (key: string, params: Record<string, string | number>, fallback?: string): string => {
      const raw = t(key, fallback)
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
        raw,
      )
    },
    [t],
  )

  const value: I18nContextType = {
    lang,
    setLang,
    t,
    ti,
    langName: langNames[lang] || 'English',
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}

export type { LanguageCode }
