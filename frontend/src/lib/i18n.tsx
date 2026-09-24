'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
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

const baseTranslations: Record<string, Record<string, string>> = { en, my, shn, mnw, ksw }
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
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({})
  const loadedRef = useRef(false)

  // Load admin translation overrides once on mount
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    fetch('/api/admin/ui-translations')
      .then(r => r.json())
      .then(data => {
        if (data.translations && typeof data.translations === 'object') {
          setOverrides(data.translations)
        }
      })
      .catch(() => {
        // API not available or failed — fall back to static translations only
      })
  }, [])

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
      // For English, check override first, then return fallback or key
      if (lang === 'en') {
        return overrides.en?.[key] || fallback || key
      }
      // For other languages: override → static → English static → fallback → key
      return overrides[lang]?.[key] || baseTranslations[lang]?.[key] || overrides.en?.[key] || baseTranslations['en']?.[key] || fallback || key
    },
    [lang, overrides]
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
