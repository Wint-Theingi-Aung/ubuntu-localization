import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Glossary History',
  description: 'View glossary change history',
}

export default function GlossaryHistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
