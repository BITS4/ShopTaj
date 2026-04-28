'use client'
import Link from 'next/link'
import { useT } from '@/store/language.store'

export default function Footer() {
  const t = useT()
  return (
    <footer className="border-t bg-background mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-primary mb-4">ShopTaj</h3>
            <p className="text-sm text-muted-foreground">{t.footer.tagline}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t.footer.shop}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/products" className="hover:text-foreground">{t.footer.all_products}</Link></li>
              <li><Link href="/products?sort=newest" className="hover:text-foreground">{t.footer.new_arrivals}</Link></li>
              <li><Link href="/products?featured=true" className="hover:text-foreground">{t.footer.featured}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t.footer.account}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/profile" className="hover:text-foreground">{t.footer.my_profile}</Link></li>
              <li><Link href="/profile/orders" className="hover:text-foreground">{t.footer.my_orders}</Link></li>
              <li><Link href="/profile/wishlist" className="hover:text-foreground">{t.footer.wishlist}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t.footer.help}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/login" className="hover:text-foreground">{t.nav.login}</Link></li>
              <li><Link href="/register" className="hover:text-foreground">{t.nav.signup}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ShopTaj. {t.footer.rights}
        </div>
      </div>
    </footer>
  )
}
