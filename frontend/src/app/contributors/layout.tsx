import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contributors',
  description: 'Top contributors to Ubuntu indigenous language translations and their rankings',
}

export default function ContributorsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
