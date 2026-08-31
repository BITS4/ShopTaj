'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Search, Menu, X, Heart, Package, Sparkles, Store } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/store/language.store'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const { user } = useAuthStore()
  const { itemCount, toggleCart } = useCartStore()
  const { logout } = useAuth()
  const router = useRouter()
  const t = useT()
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/products?search=${encodeURIComponent(search)}`)
  }

  const count = itemCount()

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full transition-all duration-300',
      scrolled
        ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-border/50'
        : 'bg-white/70 backdrop-blur-md border-b border-transparent'
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 shrink-0 group">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-md group-hover:shadow-primary/40 transition-shadow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-black text-gradient">ShopTaj</span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.nav.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 h-10 rounded-full bg-muted/60 border-transparent focus:border-primary/30 focus:bg-white transition-all"
            />
          </div>
        </form>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          <Link href="/products">
            <Button variant="ghost" size="sm" className="rounded-full font-medium">{t.nav.products}</Button>
          </Link>

          <LanguageSwitcher />

          {user ? (
            <>
              <Link href="/profile/orders">
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" title={t.nav.orders}>
                  <Package className="h-4.5 w-4.5" />
                </Button>
              </Link>
              <Link href="/profile/wishlist">
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" title={t.nav.wishlist}>
                  <Heart className="h-4.5 w-4.5" />
                </Button>
              </Link>
              <Button
                variant="ghost" size="icon"
                className="rounded-full h-9 w-9 relative"
                onClick={toggleCart}
              >
                <ShoppingBag className="h-4.5 w-4.5" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full gradient-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </Button>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="rounded-full gap-1.5 ml-1">
                  <div className="h-6 w-6 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{user.fullName[0].toUpperCase()}</span>
                  </div>
                  <span className="font-medium">{user.fullName.split(' ')[0]}</span>
                </Button>
              </Link>
              {user.role === 'SELLER' && (
                <Link href="/seller/dashboard">
                  <Button size="sm" variant="outline" className="rounded-full ml-1 gap-1.5">
                    <Store className="h-3.5 w-3.5" /> My Shop
                  </Button>
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link href="/admin">
                  <Button size="sm" className="rounded-full ml-1 gradient-primary text-white border-0 shadow-md hover:shadow-primary/30 hover:opacity-90">
                    {t.nav.admin}
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => logout.mutate()}>
                {t.nav.logout}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-full font-medium">{t.nav.login}</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="rounded-full gradient-primary text-white border-0 shadow-md hover:shadow-primary/30 hover:opacity-90 ml-1">
                  {t.nav.signup}
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-2">
          {user && (
            <Button variant="ghost" size="icon" className="rounded-full relative" onClick={toggleCart}>
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full gradient-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {count}
                </span>
              )}
            </Button>
          )}
          <LanguageSwitcher />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-2 shadow-lg">
          <form onSubmit={handleSearch} className="flex gap-2 mb-2">
            <Input
              placeholder={t.nav.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-full"
            />
            <Button type="submit" size="sm" className="rounded-full gradient-primary text-white border-0">Go</Button>
          </form>
          <Link href="/products" onClick={() => setMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start rounded-xl">{t.nav.products}</Button>
          </Link>
          {user ? (
            <>
              <Button variant="ghost" className="w-full justify-start rounded-xl" onClick={() => { toggleCart(); setMenuOpen(false) }}>
                {t.nav.cart} {count > 0 && `(${count})`}
              </Button>
              <Link href="/profile/orders" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start rounded-xl">{t.nav.orders}</Button>
              </Link>
              <Link href="/profile/wishlist" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start rounded-xl">{t.nav.wishlist}</Button>
              </Link>
              <Link href="/profile" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start rounded-xl">{t.nav.profile}</Button>
              </Link>
              {user.role === 'SELLER' && (
                <Link href="/seller/dashboard" onClick={() => setMenuOpen(false)}>
                  <Button variant="outline" className="w-full rounded-xl gap-2 justify-start">
                    <Store className="h-4 w-4" /> My Shop
                  </Button>
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link href="/admin" onClick={() => setMenuOpen(false)}>
                  <Button className="w-full rounded-xl gradient-primary text-white border-0">{t.nav.admin}</Button>
                </Link>
              )}
              <Button variant="ghost" className="w-full justify-start rounded-xl text-muted-foreground" onClick={() => { logout.mutate(); setMenuOpen(false) }}>
                {t.nav.logout}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start rounded-xl">{t.nav.login}</Button>
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                <Button className="w-full rounded-xl gradient-primary text-white border-0">{t.nav.signup}</Button>
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
