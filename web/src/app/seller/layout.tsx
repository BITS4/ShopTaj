'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { LayoutDashboard, Package, Plus, LogOut, Loader2, Store } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const NAV = [
  { href: '/seller/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/seller/products',  label: 'My Products',  icon: Package },
  { href: '/seller/products/new', label: 'Add Product', icon: Plus },
]

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      router.replace(`/login?next=${pathname}`)
    } else if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      router.replace('/')
    }
  }, [hydrated, user, router, pathname])

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl font-semibold">Seller account required</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-56 shrink-0 bg-background border-r flex flex-col">
        <div className="px-5 py-5 border-b">
          <Link href="/" className="font-bold text-primary text-lg hover:opacity-80">ShopTaj</Link>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Store className="h-3 w-3" /> Seller Panel
          </p>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t space-y-2">
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <button
            onClick={() => logout.mutate()}
            className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
