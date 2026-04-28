'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ProductCard from '@/components/product/ProductCard'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function WishlistPage() {
  const qc = useQueryClient()

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => { const { data } = await api.get('/wishlist'); return data },
  })

  const remove = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => { toast.success('Removed from wishlist'); qc.invalidateQueries({ queryKey: ['wishlist'] }) },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Heart className="h-7 w-7 text-primary" /> My Wishlist
      </h1>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
        </div>
      ) : !wishlist?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Heart className="h-20 w-20 mb-4" />
          <p className="text-lg">Your wishlist is empty</p>
          <Link href="/products"><Button className="mt-4">Discover Products</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {wishlist.map((item: any) => (
            <div key={item.id} className="relative">
              <ProductCard product={item.product} />
              <Button
                variant="destructive" size="icon"
                className="absolute top-2 right-2 h-7 w-7 rounded-full"
                onClick={() => remove.mutate(item.productId)}
              >
                <Heart className="h-3 w-3 fill-current" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
