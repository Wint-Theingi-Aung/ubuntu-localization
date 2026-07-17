'use client'

import { type ReactNode, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { useI18n } from '@/lib/i18n'

export function ClientLayout({ children }: { children: ReactNode }) {
  const { lang } = useI18n()

  // Dynamically update <html lang="..."> for SEO and accessibility
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 pt-16 lg:p-8 lg:pt-8">
        {children}
      </main>
    </div>
  )
}
