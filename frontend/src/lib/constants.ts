// ═══════════════════════════════════════════════════════════════════
// CENTRALIZED CONSTANTS — Update once, propagate everywhere
// ═══════════════════════════════════════════════════════════════════

/** Current Ubuntu release codename used for all Launchpad links */
export const UBUNTU_RELEASE = 'stonking'

// ── Language Codes ──────────────────────────────────────────────────

export interface Language {
  code: string
  name: string
  native: string
  color: string
}

export const LANGUAGES: Language[] = [
  { code: 'my',  name: 'Myanmar',     native: 'မြန်မာ',      color: '#E95420' },
  { code: 'shn', name: 'Shan',        native: 'ရှမ်း',        color: '#772953' },
  { code: 'mnw', name: 'Mon',         native: 'မွန်',         color: '#0E8420' },
  { code: 'ksw', name: "S'gaw Karen", native: 'စကောကရင်',    color: '#007AA6' },
]

export const UI_LANGUAGES = [
  { code: 'en',  label: 'EN',  name: 'English',      native: 'English'       },
  { code: 'my',  label: 'MY',  name: 'Myanmar',      native: 'မြန်မာ'       },
  { code: 'shn', label: 'SHN', name: 'Shan',         native: 'ရှမ်း'         },
  { code: 'mnw', label: 'MNW', name: 'Mon',          native: 'မွန်'          },
  { code: 'ksw', label: 'KSW', name: 'Karen',        native: 'စကောကရင်'    },
] as const

// ── Launchpad URL Builders ───────────────────────────────────────────

/**
 * Build a Launchpad translate URL for a specific package and language.
 * Pattern: /ubuntu/${release}/+source/${pkg}/+pots/${pkg}/${lang}/+translate
 */
export function lpTranslateUrl(packageName: string, langCode: string): string {
  return `https://translations.launchpad.net/ubuntu/${UBUNTU_RELEASE}/+source/${packageName}/+pots/${packageName}/${langCode}/+translate`
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

export const TRANSLATION_STATS = [
  { code: 'my',  totalEntries: 48500, translatedEntries: 20370, progress: 42 },
  { code: 'shn', totalEntries: 48500, translatedEntries: 3880,  progress: 8  },
  { code: 'mnw', totalEntries: 48500, translatedEntries: 2425,  progress: 5  },
  { code: 'ksw', totalEntries: 48500, translatedEntries: 1455,  progress: 3  },
]

// ── Dashboard Stats ───────────────────────────────────────────────────

export const DASHBOARD_STATS = {
  languages:    4,
  templates:    547,
  glossaryTerms: 153,
  contributors: 161,
}

// ── AI Translation Config ─────────────────────────────────────────────

export const TRANSLATION_CONFIG = {
  BATCH_SIZE:        15,
  MAX_FILE_SIZE_MB:  50,
  ALLOWED_EXTENSIONS: ['.po', '.pot'],
  ENDPOINT:          '/api/translate',
} as const
