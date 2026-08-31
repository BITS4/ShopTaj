'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import {
  LayoutDashboard,
  Package,
  LayoutGrid,
  ShoppingBag,
  Users,
  Tag,
  LogOut,
  Loader2,
  Store,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: LayoutGrid },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/sellers', label: 'Sellers', icon: Store },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Wait for Zustand to rehydrate from localStorage before checking auth.
  // Without this, `user` is null on every navigation and triggers a redirect.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      router.replace(`/login?next=${pathname}`)
    } else if (user.role !== 'ADMIN') {
      router.replace('/')
    }
  }, [hydrated, user, router, pathname])

  // Show spinner while hydrating
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Not admin — show message (redirect in progress)
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-xl font-semibold">Admin access required</p>
          <p className="text-sm text-muted-foreground">
            Log in with{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">admin@shoptaj.com</code> /{' '}
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Admin123!</code>
          </p>
          <Link href="/login?next=/admin" className="text-primary underline text-sm">
            Go to Login →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-background border-r flex flex-col">
        <div className="px-5 py-5 border-b">
          <Link href="/" className="font-bold text-primary text-lg hover:opacity-80">
            ShopTaj
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
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

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
