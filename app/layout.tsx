import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}