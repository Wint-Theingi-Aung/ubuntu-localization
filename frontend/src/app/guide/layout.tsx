import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guide',
  description: 'Interactive guide to Ubuntu localization — learn how to contribute translations',
}

export default function GuideLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
