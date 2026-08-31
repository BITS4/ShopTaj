import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import type { Cart } from '@/types'

interface OrderSummaryCardProps {
  cart: Cart
  title: string
  subtotalLabel: string
}

export function OrderSummaryCard({ cart, title, subtotalLabel }: OrderSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {cart.items.map((item) => (
          <div key={item.id} className="flex justify-between">
            <span>
              {item.product.name} × {item.quantity}
            </span>
            <span>
              {formatPrice(
                Number(item.variant?.price ?? item.product.discountPrice ?? item.product.price) *
                  item.quantity,
              )}
            </span>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 font-bold">
          <span>{subtotalLabel}</span>
          <span>{formatPrice(cart.total)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
