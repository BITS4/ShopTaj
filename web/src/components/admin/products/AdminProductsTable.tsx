import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorStatus } from '@/lib/api-error'
import { formatPrice } from '@/lib/utils'
import type { AdminProduct } from '@/types'

interface AdminProductsTableProps {
  error: unknown
  isError: boolean
  isLoading: boolean
  onDelete: (product: AdminProduct) => void
  onEdit: (product: AdminProduct) => void
  products?: AdminProduct[]
}

export function AdminProductsTable({
  error,
  isError,
  isLoading,
  onDelete,
  onEdit,
  products,
}: AdminProductsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-16 border rounded-xl text-destructive">
        <p className="font-medium">Failed to load products</p>
        <p className="text-sm text-muted-foreground mt-1">
          {getApiErrorStatus(error) === 403
            ? 'You are not logged in as Admin. Use admin@shoptaj.com'
            : 'Check that the backend is running'}
        </p>
      </div>
    )
  }

  if (!products?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-xl">
        <p className="text-lg mb-2">No products yet</p>
        <p className="text-sm">Click &quot;Add Product&quot; to create your first product.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">Product</th>
            <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
            <th className="text-left px-4 py-3">Price</th>
            <th className="text-left px-4 py-3 hidden md:table-cell">Stock</th>
            <th className="text-left px-4 py-3 hidden md:table-cell">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t hover:bg-muted/20">
              <td className="px-4 py-3">
                <p className="font-medium">{product.name}</p>
                {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                {product.category?.name}
              </td>
              <td className="px-4 py-3">
                {product.discountPrice ? (
                  <div>
                    <span className="font-medium text-primary">
                      {formatPrice(product.discountPrice)}
                    </span>
                    <span className="text-xs text-muted-foreground line-through ml-1">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                ) : (
                  formatPrice(product.price)
                )}
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className={product.stock === 0 ? 'text-destructive font-medium' : ''}>
                  {product.stock}
                </span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex gap-1 flex-wrap">
                  <Badge variant={product.isActive ? 'default' : 'secondary'}>
                    {product.isActive ? 'Active' : 'Hidden'}
                  </Badge>
                  {product.isFeatured && <Badge variant="outline">Featured</Badge>}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Edit ${product.name}`}
                    onClick={() => onEdit(product)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    aria-label={`Delete ${product.name}`}
                    onClick={() => onDelete(product)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 border-t text-xs text-muted-foreground">
        {products.length} product(s) total
      </div>
    </div>
  )
}
