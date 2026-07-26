import type { Metadata } from 'next'
import './globals.css'
import { I18nProvider } from '@/lib/i18n'
import { ClientLayout } from '@/components/ClientLayout'

export const metadata: Metadata = {
  title: {
    template: '%s — Ubuntu Localization Tool',
    default: 'Ubuntu Localization Tool',
  },
  description: 'Ubuntu OS Localization',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'Ubuntu Localization',
    description: 'Ubuntu OS အတွက် မြန်မာဘာသာ သာမက တိုင်းရင်းသားဘာသာစကားများ ပြုပြင်ပြောင်းလဲမှုစနစ်',
    url: 'https://ubuntu-localization.vercel.app/',
    siteName: 'Ubuntu Localization Tool',
    images: [
      {
        url: 'https://ubuntu-localization.vercel.app/og.jpg',
        width: 1200,
        height: 630,
        alt: 'Ubuntu Localization Preview',
      },
    ],
    locale: 'my_MM',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ubuntu Localization for Myanmar',
    description: 'Ubuntu OS အတွက် မြန်မာဘာသာ သာမက တိုင်းရင်းသားဘာသာစကားများ ပြုပြင်ပြောင်းလဲမှုစနစ်',
    images: ['https://ubuntu-localization.vercel.app/og.jpg'],
  },
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