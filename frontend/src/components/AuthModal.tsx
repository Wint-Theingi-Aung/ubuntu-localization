'use client'

import { useState } from 'react'
import { X, Loader2, LogIn, UserPlus } from 'lucide-react'
import { useI18n } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'

interface AuthModalProps {
  onClose: () => void
  onAuthenticated?: () => void
}

export default function AuthModal({ onClose, onAuthenticated }: AuthModalProps) {
  const { t } = useI18n()
  const { register, login } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    setError(null)

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError(t('auth_error_password_mismatch', 'Passwords do not match'))
        setLoading(false)
        return
      }
      const result = await register(username, password, displayName || undefined)
      if (!result.success) {
        setError(result.error || 'Registration failed')
        setLoading(false)
        return
      }
    } else {
      const result = await login(username, password)
      if (!result.success) {
        setError(result.error || 'Login failed')
        setLoading(false)
        return
      }
    }

    setLoading(false)
    onAuthenticated?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--tx-primary)]">
            {mode === 'login' ? t('auth_login_title', 'Sign In') : t('auth_register_title', 'Create Account')}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-overlay)] text-[var(--tx-muted)]">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-[var(--tx-muted)]">
          {mode === 'login'
            ? t('auth_login_desc', 'Sign in to edit glossary entries')
            : t('auth_register_desc', 'Register to contribute glossary terms')}
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--tx-dim)] mb-1 block">{t('auth_username', 'Username')}</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t('auth_username', 'Username')}
              className="input-field w-full"
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-xs text-[var(--tx-dim)] mb-1 block">{t('auth_display_name', 'Display Name (optional)')}</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={t('auth_display_name', 'Display Name (optional)')}
                className="input-field w-full"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-[var(--tx-dim)] mb-1 block">{t('auth_password', 'Password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('auth_password', 'Password')}
              className="input-field w-full"
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-xs text-[var(--tx-dim)] mb-1 block">{t('auth_confirm_password', 'Confirm Password')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t('auth_confirm_password', 'Confirm Password')}
                className="input-field w-full"
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading || !username.trim() || !password.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {mode === 'login' ? t('auth_login', 'Login') : t('auth_register', 'Register')}
          </button>

          <p className="text-xs text-center text-[var(--tx-muted)]">
            {mode === 'login' ? t('auth_no_account', "Don't have an account?") : t('auth_has_account', 'Already have an account?')}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
              className="text-ubuntu-orange hover:underline"
            >
              {mode === 'login' ? t('auth_register', 'Register') : t('auth_login', 'Login')}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
