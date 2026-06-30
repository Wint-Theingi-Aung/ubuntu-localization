import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { I18nProvider } from '@/lib/i18n'
import { ClientLayout } from '@/components/ClientLayout'

export const metadata: Metadata = {
  title: 'Ubuntu Localization Tool',
  description: 'AI-powered Ubuntu OS localization for indigenous languages',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#300A24] dark:bg-[#300A24] min-h-screen transition-colors duration-300">
        <I18nProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </I18nProvider>
      </body>
    </html>
  )
}
