import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Translate',
  description: 'Upload and translate Ubuntu .po files with AI-powered assistance for indigenous languages',
}

export default function TranslateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
