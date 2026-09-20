// ═══════════════════════════════════════════════════════════════════
// GLOSSARY AUTH — Password gate for glossary management
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if a password matches the configured glossary admin password.
 * Returns false if GLOSSARY_PASSWORD env var is not set (no auth required).
 */
export function isGlossaryAdmin(password: string | undefined | null): boolean {
  const configured = process.env.GLOSSARY_PASSWORD
  if (!configured) return true // No password set → open access
  if (!password) return false
  return password === configured
}

/**
 * Whether glossary editing requires a password.
 * Returns true if GLOSSARY_PASSWORD env var is set.
 */
export function isGlossaryAuthRequired(): boolean {
  return !!process.env.GLOSSARY_PASSWORD
}
