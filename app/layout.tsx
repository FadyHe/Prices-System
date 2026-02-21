import './globals.css'
import Header from '@/components/Header'

export const metadata = {
  title: 'Price Scraper',
  description: 'Compare prices',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Header />
        {children}
      </body>
    </html>
  )
}