import Footer from '@/components/Footer'
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
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}