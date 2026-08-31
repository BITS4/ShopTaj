'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import api from '@/lib/api'
import Link from 'next/link'
import { Package, Pencil, Trash2, Plus } from 'lucide-react'

interface SellerProduct {
  id: string
  name: string
  price: number | string
  stock: number
  isActive: boolean
  images?: Array<{ url: string }>
  category?: { name: string } | null
}

interface SellerProductsResponse {
  data: SellerProduct[]
  meta: { total: number; page: number; limit: number }
}

export default function SellerProductsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: async () => { const { data } = await api.get<SellerProductsResponse>('/seller/products'); return data },
  })

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/seller/products/${id}`),
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries({ queryKey: ['seller-products'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>

  const products = data?.data ?? []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Products</h1>
          <p className="text-muted-foreground text-sm">{data?.meta?.total ?? 0} products</p>
        </div>
        <Button asChild>
          <Link href="/seller/products/new"><Plus className="h-4 w-4 mr-1" />Add Product</Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Package className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No products yet</p>
          <Button asChild><Link href="/seller/products/new">Add your first product</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <Card key={p.id}>
              <CardContent className="py-4 flex items-center gap-4">
                {p.images?.[0] && (
                  <img src={p.images[0].url} alt={p.name} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.category?.name} · {Number(p.price).toFixed(2)} сом · Stock: {p.stock}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/seller/products/${p.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { if (confirm('Delete this product?')) deleteProduct.mutate(p.id) }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
