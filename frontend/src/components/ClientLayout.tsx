'use client'

import { type ReactNode, useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { useI18n } from '@/lib/i18n'

export function ClientLayout({ children }: { children: ReactNode }) {
  const { lang } = useI18n()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  // Dynamically update <html lang="..."> for SEO and accessibility
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <Header onMenuToggle={toggleSidebar} />
      <main className="flex-1 lg:ml-64 pt-14 px-4 lg:px-8 pb-4 lg:pb-8">
        {children}
      </main>
    </div>
  )
}
