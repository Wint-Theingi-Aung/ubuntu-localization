'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogIn, LogOut } from 'lucide-react'
import AuthModal from './AuthModal'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'

interface HeaderProps {
  onMenuToggle?: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { t } = useI18n()
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()

  return (
    <>
      <header className="fixed top-0 left-0 right-0 lg:left-64 h-14 z-50 flex items-center justify-between px-4 lg:px-6 border-b border-[var(--border-theme)] bg-[var(--surface-sidebar)]/95 backdrop-blur-sm">
        {/* Mobile menu button */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-[var(--tx-muted)] hover:text-[var(--tx-primary)] hover:bg-[var(--surface-card-hover)] transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Spacer for desktop (sidebar takes left side) */}
        <div className="hidden lg:block" />

        {/* Auth section */}
        <div className="flex items-center gap-3">
          {!authLoading && (
            user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-ubuntu-orange/20 flex items-center justify-center text-ubuntu-orange text-xs font-bold">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm text-[var(--tx-primary)] font-medium leading-tight">{user.displayName || user.username}</p>
                    <p className="text-[10px] text-[var(--tx-dim)] leading-tight">@{user.username}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const result = await logout()
                    if (result.success) {
                      router.push('/')
                      router.refresh()
                    }
                  }}
                  className="p-2 rounded-lg text-[var(--tx-muted)] hover:text-[var(--tx-primary)] hover:bg-[var(--surface-card-hover)] transition-colors"
                  title={t('auth_logout', 'Logout')}
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <LogIn size={16} />
                <span>{t('auth_login_title', 'Sign In')}</span>
              </button>
            )
          )}
        </div>
      </header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
