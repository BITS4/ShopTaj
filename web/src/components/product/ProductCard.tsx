'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Star, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { useAuthStore } from '@/store/auth.store'
import { useLanguageStore, useT } from '@/store/language.store'
import { localiseProduct } from '@/lib/localise'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Product } from '@/types'

interface Props { product: Product }

export default function ProductCard({ product }: Props) {
  const { addItem } = useCart()
  const { user } = useAuthStore()
  const router = useRouter()
  const t = useT()
  const { locale } = useLanguageStore()
  const { name } = localiseProduct(product, locale)
  const mainImage = product.images.find((i) => i.isMain) ?? product.images[0]
  const price = Number(product.price)
  const discount = product.discountPrice ? Number(product.discountPrice) : null
  const discountPct = discount ? Math.round((1 - discount / price) * 100) : null
  const isOutOfStock = product.stock === 0
  const qc = useQueryClient()

  const { data: wishlistIds } = useQuery<string[]>({
    queryKey: ['wishlist-ids'],
    queryFn: async () => {
      const { data } = await api.get('/wishlist')
      return data.map((item: any) => item.productId)
    },
    enabled: !!user,
    staleTime: 30_000,
  })

  const isWishlisted = wishlistIds?.includes(product.id) ?? false

  const toggleWishlist = useMutation({
    mutationFn: () =>
      isWishlisted
        ? api.delete(`/wishlist/${product.id}`)
        : api.post(`/wishlist/${product.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist-ids'] })
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: () => toast.error(t.product.login_to_add),
  })

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      toast.error(t.product.login_to_add)
      router.push('/login')
      return
    }
    addItem.mutate({ productId: product.id, quantity: 1 })
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      router.push('/login')
      return
    }
    toggleWishlist.mutate()
  }

  return (
    <div className={cn(
      'group relative flex flex-col rounded-2xl border bg-card overflow-hidden',
      'transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20',
      isOutOfStock && 'opacity-75'
    )}>
      {/* Image */}
      <Link href={`/products/${product.slug}`} className="relative aspect-[4/3] overflow-hidden bg-muted/40">
        {mainImage ? (
          <Image
            src={mainImage.url}
            alt={product.name}
            fill
            quality={90}
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
            <ShoppingCart className="h-10 w-10" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {discountPct && (
            <Badge className="gradient-primary text-white border-0 shadow-md text-xs font-bold px-2 py-0.5">
              -{discountPct}%
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="secondary" className="text-xs">Out of stock</Badge>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className={cn(
            'absolute top-2.5 right-2.5 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:bg-white hover:scale-110 shadow-md',
            isWishlisted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <Heart className={cn('h-4 w-4 transition-colors', isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground')} />
        </button>
      </Link>

      {/* Content */}
      <div className="flex flex-col gap-1.5 p-3.5 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-primary/70 uppercase tracking-wide">
            {product.category?.name}
          </span>
          {product.avgRating && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-[11px] font-semibold text-muted-foreground">
                {product.avgRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <Link href={`/products/${product.slug}`}>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          {discount ? (
            <>
              <span className="font-black text-base text-primary">{formatPrice(discount)}</span>
              <span className="text-xs text-muted-foreground line-through">{formatPrice(price)}</span>
            </>
          ) : (
            <span className="font-black text-base text-primary">{formatPrice(price)}</span>
          )}
        </div>

        {/* Add to cart */}
        <Button
          size="sm"
          className={cn(
            'w-full mt-1.5 rounded-xl font-semibold transition-all',
            !isOutOfStock && 'gradient-primary text-white border-0 hover:opacity-90 hover:shadow-md hover:shadow-primary/30'
          )}
          disabled={isOutOfStock || addItem.isPending}
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          {addItem.isPending ? t.products.adding : isOutOfStock ? t.products.out_of_stock : t.products.add_to_cart}
        </Button>
      </div>
    </div>
  )
}
