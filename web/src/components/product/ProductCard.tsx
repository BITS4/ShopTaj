'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { useAuthStore } from '@/store/auth.store'
import { useLanguageStore, useT } from '@/store/language.store'
import { localiseProduct } from '@/lib/localise'
import { toast } from 'sonner'
import type { Product } from '@/types'

interface Props { product: Product }

export default function ProductCard({ product }: Props) {
  const { addItem } = useCart()
  const { user } = useAuthStore()
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguageStore()
  const { name, description } = localiseProduct(product, locale)
  const mainImage = product.images.find((i) => i.isMain) ?? product.images[0]
  const price = Number(product.price)
  const discount = product.discountPrice ? Number(product.discountPrice) : null
  const discountPct = discount ? Math.round((1 - discount / price) * 100) : null

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
      <Link href={`/products/${product.slug}`} className="relative aspect-square overflow-hidden bg-muted">
        {mainImage ? (
          <Image
            src={mainImage.url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
        )}
        {discountPct && <Badge className="absolute top-2 left-2">{discountPct}% OFF</Badge>}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="secondary">{t.products.out_of_stock}</Badge>
          </div>
        )}
      </Link>

      <div className="flex flex-col gap-1 p-3 flex-1">
        <p className="text-xs text-muted-foreground">{product.category?.name}</p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-medium text-sm line-clamp-2 hover:text-primary">{name}</h3>
        </Link>

        {product.avgRating && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs">{product.avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
          </div>
        )}

        <div className="flex items-center gap-2 mt-auto pt-2">
          {discount ? (
            <>
              <span className="font-bold text-primary">{formatPrice(discount)}</span>
              <span className="text-xs text-muted-foreground line-through">{formatPrice(price)}</span>
            </>
          ) : (
            <span className="font-bold text-primary">{formatPrice(price)}</span>
          )}
        </div>

        <Button
          size="sm"
          className="w-full mt-2"
          disabled={product.stock === 0 || addItem.isPending}
          onClick={() => {
            if (!user) {
              toast.error(t.product.login_to_add)
              router.push('/login')
              return
            }
            addItem.mutate({ productId: product.id, quantity: 1 })
          }}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {addItem.isPending ? t.products.adding : t.products.add_to_cart}
        </Button>
      </div>
    </div>
  )
}
