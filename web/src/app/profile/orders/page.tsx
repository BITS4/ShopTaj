'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatDate } from '@/lib/utils'
import { useT } from '@/store/language.store'
import api from '@/lib/api'

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary', PROCESSING: 'default', SHIPPED: 'default',
  DELIVERED: 'outline', CANCELLED: 'destructive',
}

export default function OrdersPage() {
  const t = useT()
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => { const { data } = await api.get('/orders'); return data },
  })

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t.orders.title}</h1>
      {isLoading ? (
        <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : !data?.data.length ? (
        <div className="text-center py-24 text-muted-foreground">
          <p className="text-lg">{t.orders.empty}</p>
          <Link href="/products"><Button className="mt-4">{t.orders.start_shopping}</Button></Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data.data.map((order: any) => (
            <Link key={order.id} href={`/profile/orders/${order.id}`}>
              <div className="border rounded-xl p-5 hover:border-primary transition-colors cursor-pointer">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)} · {order.items.length} {t.orders.items}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_COLOR[order.status] || 'outline'}>{order.status}</Badge>
                    <span className="font-bold">{formatPrice(order.totalAmount)}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 text-sm text-muted-foreground">
                  {order.items.slice(0, 3).map((item: any) => item.product?.name).join(', ')}
                  {order.items.length > 3 && ` +${order.items.length - 3} more`}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
