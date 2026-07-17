import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Glossary',
  description: 'Standardized translation terms for Ubuntu localization across indigenous languages',
}

export default function GlossaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
