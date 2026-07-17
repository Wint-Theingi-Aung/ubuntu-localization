import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Templates',
  description: 'Browse Ubuntu translation packages on Launchpad and find strings to translate',
}

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
