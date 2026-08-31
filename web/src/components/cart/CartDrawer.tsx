'use client'
import Image from 'next/image'
import Link from 'next/link'
import { X, Minus, Plus, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/cart.store'
import { useCart } from '@/hooks/useCart'
import { useT } from '@/store/language.store'
import { formatPrice } from '@/lib/utils'

export default function CartDrawer() {
  const { cart, isOpen, closeCart } = useCartStore()
  const { updateItem, removeItem } = useCart()
  const t = useT()

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={closeCart} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-background shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> {t.nav.cart} ({cart?.items.length ?? 0})
          </h2>
          <Button variant="ghost" size="icon" onClick={closeCart}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!cart?.items.length ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
              <ShoppingBag className="h-16 w-16" />
              <p>{t.cart.empty}</p>
              <Link href="/products" onClick={closeCart}>
                <Button>{t.cart.browse}</Button>
              </Link>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {item.product.images[0] && (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product.name}</p>
                  {item.variant && (
                    <p className="text-xs text-muted-foreground">
                      {[item.variant.size, item.variant.color].filter(Boolean).join(' / ')}
                    </p>
                  )}
                  <p className="text-sm font-semibold mt-1">
                    {formatPrice(
                      item.variant?.price ?? item.product.discountPrice ?? item.product.price,
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() =>
                        updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 ml-auto text-destructive"
                      onClick={() => removeItem.mutate(item.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between text-sm font-semibold">
              <span>{t.cart.total}</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
            <Link href="/checkout" onClick={closeCart}>
              <Button className="w-full">{t.cart.checkout}</Button>
            </Link>
            <Link href="/cart" onClick={closeCart}>
              <Button variant="outline" className="w-full">
                {t.cart.continue}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
