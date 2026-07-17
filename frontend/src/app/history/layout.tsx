import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'History',
  description: 'View your translation export history and past contributions',
}

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
