import type { Metadata } from 'next'
import './globals.css'
import { I18nProvider } from '@/lib/i18n'
import { ClientLayout } from '@/components/ClientLayout'

export const metadata: Metadata = {
  title: {
    template: '%s — Ubuntu Localization Tool',
    default: 'Ubuntu Localization Tool',
  },
  description: 'Ubuntu OS localization for indigenous languages',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen transition-colors duration-300" suppressHydrationWarning>
        <I18nProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </I18nProvider>
      </body>
    </html>
  )
}
