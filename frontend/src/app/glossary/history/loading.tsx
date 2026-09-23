'use client'

import { Loader2 } from 'lucide-react'

export default function GlossaryHistoryLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-ubuntu-orange" size={32} />
      </div>
    </div>
  )
}
