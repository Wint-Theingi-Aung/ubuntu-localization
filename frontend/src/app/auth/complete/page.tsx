'use client'

import { useEffect } from 'react'

/**
 * OAuth callback confirmation page.
 * Opened in a new tab by the sign-in flow. Sends a postMessage to the
 * opener tab so it can refresh auth state, then closes itself.
 */
export default function AuthCompletePage() {
  useEffect(() => {
    // Notify the opener tab that authentication completed
    if (window.opener) {
      window.opener.postMessage({ type: 'launchpad-auth', status: 'success' }, window.location.origin)
    }
    // Small delay so the message is delivered before the tab closes
    const timer = setTimeout(() => window.close(), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)]">
      <div className="text-center space-y-3">
        <p className="text-[var(--tx-primary)] text-lg font-medium">Sign-in complete</p>
        <p className="text-[var(--tx-muted)] text-sm">This window will close automatically.</p>
      </div>
    </div>
  )
}
