'use client'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice, formatDate } from '@/lib/utils'
import { useT } from '@/store/language.store'
import api from '@/lib/api'
import { toast } from 'sonner'

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary', PROCESSING: 'default', SHIPPED: 'default',
  DELIVERED: 'outline', CANCELLED: 'destructive',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const t = useT()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => { const { data } = await api.get(`/orders/${id}`); return data },
  })

  const cancel = useMutation({
    mutationFn: () => api.post(`/orders/${id}/cancel`),
    onSuccess: () => { toast.success(t.orders.cancel_order); qc.invalidateQueries({ queryKey: ['order', id] }) },
    onError: () => toast.error(t.common.error),
  })

  if (isLoading) return <div className="container mx-auto px-4 py-8"><Skeleton className="h-96" /></div>
  if (!order) return <div className="container mx-auto px-4 py-8 text-center">{t.common.not_found}</div>

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">#{order.id.slice(0, 8).toUpperCase()}</h1>
        <Badge variant={STATUS_COLOR[order.status] || 'outline'}>{order.status}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>

      <div className="border rounded-xl overflow-hidden">
        <h2 className="font-semibold px-4 py-3 border-b bg-muted/30">{t.orders.items}</h2>
        {order.items.map((item: any) => (
          <div key={item.id} className="flex gap-4 px-4 py-3 border-b last:border-0">
            <div className="relative h-16 w-16 shrink-0 rounded-md overflow-hidden bg-muted">
              {item.product?.images?.[0] && (
                <Image src={item.product.images[0].url} alt={item.productName} fill className="object-cover" />
              )}
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium">{item.productName}</p>
              {item.variant && <p className="text-muted-foreground">{[item.variant.size, item.variant.color].filter(Boolean).join(' / ')}</p>}
              <p className="mt-1">× {item.quantity} · {formatPrice(item.priceAtPurchase)}</p>
            </div>
            <p className="font-semibold text-sm">{formatPrice(Number(item.priceAtPurchase) * item.quantity)}</p>
          </div>
        ))}
      </div>

      {order.shippingAddress && (
        <div className="border rounded-xl p-4">
          <h2 className="font-semibold mb-2">{t.orders.shipping_address}</h2>
          <p className="text-sm text-muted-foreground">
            {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.country} {order.shippingAddress.zip}
          </p>
        </div>
      )}

      <div className="border rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span>{t.checkout.shipping}</span><span>{formatPrice(order.shippingAmount)}</span></div>
        {Number(order.discountAmount) > 0 && (
          <div className="flex justify-between text-green-600"><span>{t.cart.discount}</span><span>-{formatPrice(order.discountAmount)}</span></div>
        )}
        <div className="flex justify-between font-bold text-base border-t pt-2">
          <span>{t.cart.total}</span><span>{formatPrice(order.totalAmount)}</span>
        </div>
      </div>

      {order.status === 'PENDING' && (
        <Button variant="destructive" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
          {cancel.isPending ? t.orders.cancelling : t.orders.cancel_order}
        </Button>
      )}
    </div>
  )
}
