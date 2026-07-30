/**
 * Shared types for the Ubuntu Localization Tool
 */

/** Translation template stats from Launchpad */
export interface TranslationTemplate {
  name: string
  sourcePackage: string
  total: number
  translated: number
  untranslated: number
  completionPct: number
}
