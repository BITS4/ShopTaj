import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/cart/CartDrawer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ShopTaj — Premium E-Commerce',
  description: 'Shop the best products at the best prices',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <CartDrawer />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
