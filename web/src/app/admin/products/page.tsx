'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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
  const { register, handleSubmit, reset, setValue } = useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => { const { data } = await api.get('/products?limit=50'); return data },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await api.get('/categories'); return data },
  })

  const create = useMutation({
    mutationFn: (body: any) => api.post('/admin/products', body),
    onSuccess: () => { toast.success('Product created'); qc.invalidateQueries({ queryKey: ['admin-products'] }); setShowForm(false); reset() },
    onError: () => toast.error('Failed to create product'),
  })

  const update = useMutation({
    mutationFn: ({ id, ...body }: any) => api.patch(`/admin/products/${id}`, body),
    onSuccess: () => { toast.success('Product updated'); qc.invalidateQueries({ queryKey: ['admin-products'] }); setEditId(null); reset() },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: () => { toast.success('Product deleted'); qc.invalidateQueries({ queryKey: ['admin-products'] }) },
  })

  const onSubmit = (data: any) => {
    data.price = Number(data.price)
    data.stock = Number(data.stock)
    if (data.discountPrice) data.discountPrice = Number(data.discountPrice)
    if (editId) update.mutate({ id: editId, ...data })
    else create.mutate(data)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button onClick={() => { setShowForm(!showForm); setEditId(null); reset() }}>
          <Plus className="h-4 w-4 mr-2" />{showForm ? 'Cancel' : 'Add Product'}
        </Button>
      </div>

      {/* Form */}
      {(showForm || editId) && (
        <Card className="mb-8">
          <CardHeader><CardTitle>{editId ? 'Edit Product' : 'New Product'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 gap-4">
              <div><label className="text-xs font-medium">Name *</label><Input {...register('name', { required: true })} /></div>
              <div><label className="text-xs font-medium">Brand</label><Input {...register('brand')} /></div>
              <div className="sm:col-span-2"><label className="text-xs font-medium">Description</label><textarea className="w-full border rounded-md p-2 text-sm min-h-20 bg-background" {...register('description')} /></div>
              <div><label className="text-xs font-medium">Price *</label><Input type="number" step="0.01" {...register('price', { required: true })} /></div>
              <div><label className="text-xs font-medium">Discount Price</label><Input type="number" step="0.01" {...register('discountPrice')} /></div>
              <div><label className="text-xs font-medium">Stock *</label><Input type="number" {...register('stock', { required: true })} /></div>
              <div>
                <label className="text-xs font-medium">Category *</label>
                <select className="w-full h-10 border rounded-md px-3 text-sm bg-background" {...register('categoryId', { required: true })}>
                  <option value="">Select category</option>
                  {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium">Tags (comma separated)</label><Input {...register('tags')} placeholder="tag1, tag2" /></div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium flex items-center gap-2">
                  <input type="checkbox" {...register('isFeatured')} /> Featured
                </label>
                <label className="text-xs font-medium flex items-center gap-2">
                  <input type="checkbox" {...register('isActive')} defaultChecked /> Active
                </label>
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {editId ? 'Update' : 'Create'} Product
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); reset() }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3">Price</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Stock</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data?.data.map((product: any) => (
                <tr key={product.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{product.category?.name}</td>
                  <td className="px-4 py-3">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{product.stock}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant={product.isActive ? 'default' : 'secondary'}>{product.isActive ? 'Active' : 'Hidden'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditId(product.id); setShowForm(false); Object.entries(product).forEach(([k, v]) => setValue(k, v)) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
