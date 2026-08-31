'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, Users, DollarSign, TrendingUp, Package, Tag, LayoutGrid } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils'
import api from '@/lib/api'

const NAV = [
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/categories', label: 'Categories', icon: LayoutGrid },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
]

interface TopProduct {
  productId: string
  _sum: { quantity: number | null }
  product?: { name: string; price: number | string }
}

interface AdminAnalytics {
  totalRevenue: number | string
  totalOrders: number
  totalUsers: number
  ordersToday: number
  topProducts: TopProduct[]
}

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data } = await api.get<AdminAnalytics>('/admin/analytics')
      return data
    },
  })

  const stats = [
    {
      label: 'Total Revenue',
      value: analytics ? formatPrice(analytics.totalRevenue) : '—',
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      label: 'Total Orders',
      value: analytics?.totalOrders ?? '—',
      icon: ShoppingBag,
      color: 'text-blue-600',
    },
    {
      label: 'Total Users',
      value: analytics?.totalUsers ?? '—',
      icon: Users,
      color: 'text-purple-600',
    },
    {
      label: 'Orders Today',
      value: analytics?.ordersToday ?? '—',
      icon: TrendingUp,
      color: 'text-orange-600',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  )}
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-20`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                <Icon className="h-10 w-10 text-primary" />
                <span className="font-semibold">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Top Products */}
      {analytics && analytics.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topProducts.map((tp, i) => (
                <div key={tp.productId} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium">{tp.product?.name ?? 'Unknown'}</span>
                  <span className="text-muted-foreground">{tp._sum.quantity} sold</span>
                  <span className="font-semibold">
                    {tp.product ? formatPrice(tp.product.price) : ''}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
