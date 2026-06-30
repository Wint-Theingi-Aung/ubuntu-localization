'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('ubuntu-theme')
    if (stored === 'light') {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    } else {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('ubuntu-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('ubuntu-theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.08] transition-all duration-200 text-sm"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="flex items-center gap-3">
        {isDark ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
        <span>{isDark ? 'Dark' : 'Light'}</span>
      </span>
      <div
        className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${
          isDark ? 'bg-white/20' : 'bg-amber-400/30'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
            isDark ? 'left-0.5' : 'left-[18px]'
          }`}
        />
      </div>
    </button>
  )
}
