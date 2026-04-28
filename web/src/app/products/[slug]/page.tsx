'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Heart, ShoppingCart, Star, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import StarRating from '@/components/product/StarRating'
import { useCart } from '@/hooks/useCart'
import { formatPrice, formatDate } from '@/lib/utils'
import api from '@/lib/api'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { addItem } = useCart()
  const [selectedVariant, setSelectedVariant] = useState<string | undefined>()
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => { const { data } = await api.get(`/products/${slug}`); return data },
  })

  const addToWishlist = useMutation({
    mutationFn: () => api.post(`/wishlist/${product.id}`),
    onSuccess: () => toast.success('Added to wishlist'),
    onError: () => toast.error('Already in wishlist or login required'),
  })

  if (isLoading) return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </div>
    </div>
  )

  if (!product) return <div className="container mx-auto px-4 py-8 text-center">Product not found</div>

  const price = Number(product.price)
  const discount = product.discountPrice ? Number(product.discountPrice) : null
  const sizes = [...new Set(product.variants.map((v: any) => v.size).filter(Boolean))]
  const colors = [...new Set(product.variants.map((v: any) => v.color).filter(Boolean))]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
            {product.images[activeImage] && (
              <Image
                src={product.images[activeImage].url}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img: any, i: number) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-16 w-16 shrink-0 rounded-md overflow-hidden border-2 transition ${i === activeImage ? 'border-primary' : 'border-transparent'}`}
                >
                  <Image src={img.url} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{product.category?.name}</p>
            <h1 className="text-3xl font-bold mt-1">{product.name}</h1>
            {product.brand && <p className="text-sm text-muted-foreground mt-1">by <span className="font-medium">{product.brand}</span></p>}
          </div>

          {product.avgRating && (
            <div className="flex items-center gap-2">
              <StarRating rating={product.avgRating} />
              <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {discount ? (
              <>
                <span className="text-3xl font-bold text-primary">{formatPrice(discount)}</span>
                <span className="text-lg text-muted-foreground line-through">{formatPrice(price)}</span>
                <Badge>{Math.round((1 - discount / price) * 100)}% OFF</Badge>
              </>
            ) : (
              <span className="text-3xl font-bold text-primary">{formatPrice(price)}</span>
            )}
          </div>

          {product.description && (
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          {/* Variants */}
          {sizes.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Size</p>
              <div className="flex gap-2 flex-wrap">
                {sizes.map((size: any) => (
                  <button
                    key={size}
                    onClick={() => setSelectedVariant(product.variants.find((v: any) => v.size === size)?.id)}
                    className={`px-4 py-2 border rounded-md text-sm transition ${selectedVariant === product.variants.find((v: any) => v.size === size)?.id ? 'border-primary bg-primary/10 font-semibold' : 'hover:border-primary'}`}
                  >{size}</button>
                ))}
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">Color</p>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color: any) => (
                  <button key={color} className="px-4 py-2 border rounded-md text-sm hover:border-primary transition">{color}</button>
                ))}
              </div>
            </div>
          )}

          {/* Qty */}
          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-md">
              <button className="px-3 py-2 hover:bg-muted" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span className="px-4 py-2 text-sm font-medium">{qty}</span>
              <button className="px-3 py-2 hover:bg-muted" onClick={() => setQty(qty + 1)}>+</button>
            </div>
            <p className="text-sm text-muted-foreground">
              {product.stock > 0 ? <span className="text-green-600">{product.stock} in stock</span> : <span className="text-destructive">Out of stock</span>}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1"
              disabled={product.stock === 0}
              onClick={() => addItem.mutate({ productId: product.id, variantId: selectedVariant, quantity: qty })}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />Add to Cart
            </Button>
            <Button size="lg" variant="outline" onClick={() => addToWishlist.mutate()}>
              <Heart className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md p-3">
            <Truck className="h-4 w-4 text-primary" />
            Free shipping on orders over $50
          </div>

          {product.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {product.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      {product.reviews.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          <div className="space-y-4">
            {product.reviews.map((review: any) => (
              <div key={review.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                    {review.user.fullName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{review.user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                  </div>
                  <StarRating rating={review.rating} className="ml-auto" />
                </div>
                {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
