'use client'
import Link from 'next/link'
import { Sparkles, Mail, Phone, MapPin, Instagram, Send } from 'lucide-react'
import { useT } from '@/store/language.store'

export default function Footer() {
  const t = useT()
  return (
    <footer className="bg-gray-950 text-gray-300 mt-0">
      {/* Main footer */}
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-black text-white">ShopTaj</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">{t.footer.tagline}</p>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Dushanbe, Tajikistan</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>+992 900 000 000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>hello@shop-taj.com</span>
              </div>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">{t.footer.shop}</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: '/products', label: t.footer.all_products },
                { href: '/products?sortBy=newest', label: t.footer.new_arrivals },
                { href: '/products', label: t.footer.featured },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link href={href} className="text-gray-400 hover:text-primary transition-colors duration-200">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">{t.footer.account}</h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { href: '/profile', label: t.footer.my_profile },
                { href: '/profile/orders', label: t.footer.my_orders },
                { href: '/profile/wishlist', label: t.footer.wishlist },
                { href: '/login', label: t.nav.login },
                { href: '/register', label: t.nav.signup },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link href={href} className="text-gray-400 hover:text-primary transition-colors duration-200">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social + Payment */}
          <div>
            <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Follow Us</h4>
            <div className="flex gap-3 mb-8">
              {[
                { icon: Instagram, href: '#', label: 'Instagram' },
                { icon: Send, href: '#', label: 'Telegram' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="h-9 w-9 rounded-xl bg-white/10 hover:bg-primary flex items-center justify-center transition-all duration-200 hover:scale-110"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4 text-white" />
                </a>
              ))}
            </div>

            <h4 className="font-bold text-white mb-3 text-sm uppercase tracking-wide">Payment</h4>
            <div className="flex flex-wrap gap-2">
              {['Visa', 'MC', 'Корти Миллӣ', 'DC'].map((p) => (
                <span
                  key={p}
                  className="text-[10px] font-bold px-2 py-1 rounded-md bg-white/10 text-gray-300 border border-white/10"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} ShopTaj. {t.footer.rights}</span>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
