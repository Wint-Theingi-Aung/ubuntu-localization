'use client'

import { type ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {children}
      </main>
    </div>
  )
}
