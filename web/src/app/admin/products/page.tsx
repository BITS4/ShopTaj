'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Upload, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/utils'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function AdminProductsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: { isActive: true, isFeatured: false },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      // Use admin endpoint which bypasses isActive filter
      const { data } = await api.get('/admin/products-list')
      return data
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await api.get('/categories'); return data },
  })

  const create = useMutation({
    mutationFn: async (body: any) => {
      const { data: product } = await api.post('/admin/products', body)
      // Upload images if selected
      if (imageFiles && imageFiles.length > 0) {
        const formData = new FormData()
        Array.from(imageFiles).forEach((f) => formData.append('files', f))
        await api.post(`/admin/products/${product.id}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      return product
    },
    onSuccess: () => {
      toast.success('Product created!')
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setShowForm(false)
      setImageFiles(null)
      reset({ isActive: true, isFeatured: false })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create product')
    },
  })

  const update = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/admin/products/${id}`, body),
    onSuccess: () => {
      toast.success('Product updated')
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      setEditId(null)
      reset({ isActive: true, isFeatured: false })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries({ queryKey: ['admin-products'] }) },
    onError: () => toast.error('Failed to delete product'),
  })

  const onSubmit = (formData: any) => {
    // Convert types properly
    const payload: any = {
      name: formData.name,
      description: formData.description || undefined,
      brand: formData.brand || undefined,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
      categoryId: formData.categoryId,
      isActive: Boolean(formData.isActive),
      isFeatured: Boolean(formData.isFeatured),
    }

    // Discount price — only include if filled
    if (formData.discountPrice && parseFloat(formData.discountPrice) > 0) {
      payload.discountPrice = parseFloat(formData.discountPrice)
    }

    // Tags — convert "tag1, tag2" string to array
    if (formData.tags && formData.tags.trim()) {
      payload.tags = formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    } else {
      payload.tags = []
    }

    if (editId) update.mutate({ id: editId, ...payload })
    else create.mutate(payload)
  }

  const startEdit = (product: any) => {
    setEditId(product.id)
    setShowForm(false)
    setValue('name', product.name)
    setValue('brand', product.brand || '')
    setValue('description', product.description || '')
    setValue('price', product.price)
    setValue('discountPrice', product.discountPrice || '')
    setValue('stock', product.stock)
    setValue('categoryId', product.categoryId)
    setValue('tags', (product.tags || []).join(', '))
    setValue('isFeatured', product.isFeatured)
    setValue('isActive', product.isActive)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditId(null)
    setImageFiles(null)
    reset({ isActive: true, isFeatured: false })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={() => { cancelForm(); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-2" />Add Product
        </Button>
      </div>

      {/* Form */}
      {(showForm || editId) && (
        <Card className="mb-8 border-primary/30">
          <CardHeader>
            <CardTitle>{editId ? 'Edit Product' : 'New Product'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Name *</label>
                  <Input {...register('name', { required: 'Name is required' })} placeholder="Product name" />
                </div>
                <div>
                  <label className="text-xs font-medium">Brand</label>
                  <Input {...register('brand')} placeholder="e.g. Nike, Apple" />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium">Description</label>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm min-h-[80px] bg-background resize-none"
                    placeholder="Product description..."
                    {...register('description')}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium">Price (USD) *</label>
                  <Input type="number" step="0.01" min="0" {...register('price', { required: 'Price is required' })} placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs font-medium">Discount Price (leave empty for no sale)</label>
                  <Input type="number" step="0.01" min="0" {...register('discountPrice')} placeholder="0.00" />
                </div>

                <div>
                  <label className="text-xs font-medium">Stock *</label>
                  <Input type="number" min="0" {...register('stock', { required: 'Stock is required' })} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-medium">Category *</label>
                  <select
                    className="w-full h-10 border rounded-md px-3 text-sm bg-background"
                    {...register('categoryId', { required: 'Category is required' })}
                  >
                    <option value="">-- Select category --</option>
                    {categories?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    {!categories?.length && <option disabled>No categories yet — create one first</option>}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium">Tags <span className="text-muted-foreground">(comma separated)</span></label>
                  <Input {...register('tags')} placeholder="electronics, wireless, bluetooth" />
                </div>

                {/* Images — only on create */}
                {!editId && (
                  <div>
                    <label className="text-xs font-medium">Images <span className="text-muted-foreground">(optional, max 5MB each)</span></label>
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => setImageFiles(e.target.files)}
                      className="h-10 text-sm pt-1.5"
                    />
                  </div>
                )}

                <div className="flex items-center gap-6 sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
                    <span className="text-sm font-medium">Active <span className="text-muted-foreground font-normal">(visible to customers)</span></span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register('isFeatured')} className="w-4 h-4" />
                    <span className="text-sm font-medium">Featured <span className="text-muted-foreground font-normal">(shown on homepage)</span></span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {create.isPending || update.isPending ? 'Saving…' : editId ? 'Update Product' : 'Create Product'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* No categories warning */}
      {!categories?.length && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          No categories found. Go to <a href="/admin" className="underline font-medium">Admin → Categories</a> to create one before adding products.
        </div>
      )}

      {/* Products table */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : !data?.length ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <p className="text-lg mb-2">No products yet</p>
          <p className="text-sm">Click "Add Product" to create your first product.</p>
        </div>
      ) : (
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
              {data.map((product: any) => (
                <tr key={product.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{product.name}</p>
                    {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{product.category?.name}</td>
                  <td className="px-4 py-3">
                    {product.discountPrice ? (
                      <div>
                        <span className="font-medium text-primary">{formatPrice(product.discountPrice)}</span>
                        <span className="text-xs text-muted-foreground line-through ml-1">{formatPrice(product.price)}</span>
                      </div>
                    ) : (
                      formatPrice(product.price)
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={product.stock === 0 ? 'text-destructive font-medium' : ''}>{product.stock}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      <Badge variant={product.isActive ? 'default' : 'secondary'}>{product.isActive ? 'Active' : 'Hidden'}</Badge>
                      {product.isFeatured && <Badge variant="outline">Featured</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Delete "${product.name}"?`)) remove.mutate(product.id) }}
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
            {data.length} product(s) total
          </div>
        </div>
      )}
    </div>
  )
}
