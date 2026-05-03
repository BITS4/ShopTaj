'use client'
import Image from 'next/image'
import Link from 'next/link'
import { X, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCart } from '@/hooks/useCart'
import { useT } from '@/store/language.store'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const { cart, isLoading, updateItem, removeItem, applyCoupon } = useCart()
  const t = useT()
  const [couponCode, setCouponCode] = useState('')
  const [couponData, setCouponData] = useState<any>(null)

  const handleCoupon = async () => {
    const result = await applyCoupon.mutateAsync(couponCode)
    setCouponData(result.data)
  }

  const discount = couponData
    ? couponData.discountType === 'PERCENTAGE'
      ? ((cart?.total ?? 0) * couponData.discountValue) / 100
      : couponData.discountValue
    : 0

  const finalTotal = (cart?.total ?? 0) - discount

  if (isLoading) return <div className="container mx-auto px-4 py-8 text-center">{t.common.loading}</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t.cart.title}</h1>

      {!cart?.items.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ShoppingBag className="h-24 w-24 mb-4" />
          <h2 className="text-xl font-semibold">{t.cart.empty}</h2>
          <Link href="/products" className="mt-4"><Button>{t.cart.browse}</Button></Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.items.map((item: any) => (
              <div key={item.id} className="flex gap-4 p-4 border rounded-xl">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.product.images[0] && (
                    <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <Link href={`/products/${item.product.slug}`}>
                    <h3 className="font-semibold hover:text-primary">{item.product.name}</h3>
                  </Link>
                  {item.variant && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {[item.variant.size, item.variant.color].filter(Boolean).join(' / ')}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary mt-1">
                    {formatPrice(item.variant?.price ?? item.product.discountPrice ?? item.product.price)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border rounded-md">
                      <button className="px-3 py-1.5 hover:bg-muted text-sm" onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity - 1 })}>−</button>
                      <span className="px-3 py-1.5 text-sm">{item.quantity}</span>
                      <button className="px-3 py-1.5 hover:bg-muted text-sm" onClick={() => updateItem.mutate({ id: item.id, quantity: item.quantity + 1 })}>+</button>
                    </div>
                    <button onClick={() => removeItem.mutate(item.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right font-semibold">
                  {formatPrice(Number(item.variant?.price ?? item.product.discountPrice ?? item.product.price) * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="border rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold">{t.cart.title}</h2>
              <div className="flex justify-between text-sm"><span>{t.cart.subtotal}</span><span>{formatPrice(cart.total)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600"><span>{t.cart.discount}</span><span>-{formatPrice(discount)}</span></div>
              )}
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>{t.cart.total}</span><span>{formatPrice(finalTotal)}</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t.cart.coupon_placeholder}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="text-sm"
                />
                <Button variant="outline" size="sm" onClick={handleCoupon} disabled={applyCoupon.isPending}>
                  {t.cart.apply_coupon}
                </Button>
              </div>
              <Link href={couponData ? `/checkout?coupon=${couponCode}` : '/checkout'}>
                <Button className="w-full" size="lg">{t.cart.checkout}</Button>
              </Link>
              <Link href="/products">
                <Button variant="ghost" className="w-full">{t.cart.continue}</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
