// ═══════════════════════════════════════════════════════════════════
// CENTRALIZED CONSTANTS — Update once, propagate everywhere
// ═══════════════════════════════════════════════════════════════════

/** Current Ubuntu release codename used for all translation links */
export const UBUNTU_RELEASE = 'stonking'

// ── Language Codes ──────────────────────────────────────────────────

export interface Language {
  code: string
  name: string
  native: string
  color: string
}

export const LANGUAGES: Language[] = [
  { code: 'my',  name: 'Burmese',     native: 'ဗမာ',          color: '#E95420' },
  { code: 'shn', name: 'Shan',        native: 'ရှမ်း',        color: '#772953' },
  { code: 'mnw', name: 'Mon',         native: 'မွန်',         color: '#0E8420' },
  { code: 'ksw', name: "S'gaw Karen", native: 'စကောကရင်',    color: '#007AA6' },
]

export const UI_LANGUAGES = [
  { code: 'en',  label: 'EN',  name: 'English',      native: 'English'       },
  { code: 'my',  label: 'MY',  name: 'Burmese',      native: 'ဗမာ'          },
  { code: 'shn', label: 'SHN', name: 'Shan',         native: 'ရှမ်း'         },
  { code: 'mnw', label: 'MNW', name: 'Mon',          native: 'မွန်'          },
  { code: 'ksw', label: 'KSW', name: 'Karen',        native: 'စကောကရင်'    },
] as const

// ── Launchpad URL Builders ───────────────────────────────────────────

/**
 * Build a Launchpad translate URL for a specific package and language.
 * Pattern: /ubuntu/${release}/+source/${sourcePackage}/+pots/${templateName}/${lang}/+translate
 * @param templateName - The translation template name (used in +pots/ and shown to users)
 * @param langCode - The language code (e.g. 'my', 'shn')
 * @param sourcePackage - The actual Launchpad source package name (used in +source/). Defaults to templateName.
 */
export function lpTranslateUrl(templateName: string, langCode: string, sourcePackage?: string): string {
  const src = sourcePackage || templateName
  return `https://translations.launchpad.net/ubuntu/${UBUNTU_RELEASE}/+source/${src}/+pots/${templateName}/${langCode}/+translate`
}

/**
 * Build a Launchpad language overview URL.
 * Pattern: /ubuntu/${release}/+lang/${lang}
 */
export function lpLanguageUrl(langCode: string): string {
  return `https://translations.launchpad.net/ubuntu/${UBUNTU_RELEASE}/+lang/${langCode}`
}

/**
 * Build the Launchpad Ubuntu translations home URL.
 */
export function lpUbuntuUrl(): string {
  return `https://translations.launchpad.net/ubuntu/${UBUNTU_RELEASE}`
}

// ── API Endpoints ─────────────────────────────────────────────────────

export const API = {
  UPLOAD:   '/api/upload',
  TRANSLATE:'/api/translate',
  EXPORT:   '/api/export',
  PROGRESS: '/api/progress',
} as const

// ── Translation Stats (can be fetched from API at runtime) ──────────

// Source: Launchpad series overview (fetched 2026-10-17)
// Total: 401,517 strings across all Ubuntu 26.10 (stonking) templates
export const TRANSLATION_STATS = [
  { code: 'my',  totalEntries: 401517, translatedEntries: 75244,  progress: 18.7 },
  { code: 'shn', totalEntries: 401517, translatedEntries: 1633,   progress: 0.4  },
  { code: 'mnw', totalEntries: 401517, translatedEntries: 6945,   progress: 1.7  },
  { code: 'ksw', totalEntries: 401517, translatedEntries: 0,      progress: 0    },
]

// ── Dashboard Stats ───────────────────────────────────────────────────
// templates = Launchpad series.getTranslationTemplates() count (2026-10-17)
// contributors = unique people in ubuntu-l10n-* teams + language pages (2026-10-17)

export const DASHBOARD_STATS = {
  languages:    4,
  templates:    552,
  glossaryTerms: 153,
  contributors: 161,
}

// ── AI Translation Config ─────────────────────────────────────────────

export const TRANSLATION_CONFIG = {
  BATCH_SIZE:        10,
  MAX_FILE_SIZE_MB:  50,
  ALLOWED_EXTENSIONS: ['.po'],
  ENDPOINT:          '/api/translate',
} as const
