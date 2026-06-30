'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: (number | string)[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg bg-[var(--surface-overlay)] hover:bg-[var(--surface-card-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--tx-muted)]"
      >
        <ChevronLeft size={18} />
      </button>

      {pages.map((page, idx) =>
        typeof page === 'string' ? (
          <span key={`e-${idx}`} className="px-2 text-[var(--tx-dim)]">{page}</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 rounded-lg transition-colors font-medium ${
              currentPage === page
                ? 'bg-ubuntu-orange text-white'
                : 'bg-[var(--surface-overlay)] hover:bg-[var(--surface-card-hover)] text-[var(--tx-muted)]'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg bg-[var(--surface-overlay)] hover:bg-[var(--surface-card-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[var(--tx-muted)]"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
