import Footer from '@/components/Footer'
import './globals.css'
import Header from '@/components/Header'
import LightRays from '@/components/LightRays'
import Providers from '@/components/Providers'

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
        <Providers>
          <Header />
          <div className="fixed inset-0 z-[-1] w-screen h-screen">
            <LightRays
              raysOrigin="top-center-offset"
              raysColor="#777777"
              raysSpeed={1}
              lightSpread={1.5}
              rayLength={1.8}
              followMouse={true}
              mouseInfluence={0.09}
              noiseAmount={0.1}
              distortion={0}
              className="custom-rays"
              pulsating={false}
              fadeDistance={1}
              saturation={1}
            />
          </div>
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}