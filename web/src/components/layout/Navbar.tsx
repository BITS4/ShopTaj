'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Search, User, Menu, X, Heart } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth.store'
import { useCartStore } from '@/store/cart.store'
import { useAuth } from '@/hooks/useAuth'

export default function Navbar() {
  const { user } = useAuthStore()
  const { itemCount, toggleCart } = useCartStore()
  const { logout } = useAuth()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) router.push(`/products?search=${encodeURIComponent(search)}`)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-primary">
          ShopTaj
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </form>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          <Link href="/products">
            <Button variant="ghost" size="sm">Products</Button>
          </Link>

          {user ? (
            <>
              <Link href="/profile/wishlist">
                <Button variant="ghost" size="icon"><Heart className="h-5 w-5" /></Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={toggleCart} className="relative">
                <ShoppingBag className="h-5 w-5" />
                {itemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {itemCount()}
                  </span>
                )}
              </Button>
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  {user.fullName.split(' ')[0]}
                </Button>
              </Link>
              {user.role === 'ADMIN' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">Admin</Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost" size="sm">Login</Button></Link>
              <Link href="/register"><Button size="sm">Sign Up</Button></Link>
            </>
          )}
        </nav>

        {/* Mobile menu toggle */}
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 flex flex-col gap-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button type="submit" size="sm">Go</Button>
          </form>
          <Link href="/products" onClick={() => setMenuOpen(false)}><Button variant="ghost" className="w-full justify-start">Products</Button></Link>
          {user ? (
            <>
              <Link href="/cart" onClick={() => setMenuOpen(false)}><Button variant="ghost" className="w-full justify-start">Cart ({itemCount()})</Button></Link>
              <Link href="/profile" onClick={() => setMenuOpen(false)}><Button variant="ghost" className="w-full justify-start">Profile</Button></Link>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { logout.mutate(); setMenuOpen(false) }}>Logout</Button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}><Button variant="ghost" className="w-full justify-start">Login</Button></Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}><Button className="w-full">Sign Up</Button></Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
