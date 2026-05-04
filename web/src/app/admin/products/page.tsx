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
  const [mainImageFile, setMainImageFile] = useState<FileList | null>(null)
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const { register, handleSubmit, reset, setValue, watch } = useForm<any>({
    defaultValues: { isActive: true, isFeatured: true },
  })

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
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
      await uploadImages(product.id)
      return product
    },
    onSuccess: () => {
      toast.success('Product created!')
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setShowForm(false)
      setMainImageFile(null)
      setImageFiles(null)
      reset({ isActive: true, isFeatured: true })
    },
    onError: (err: any) => {
      const status = err?.response?.status
      const msg = err?.response?.data?.message
      if (status === 403) {
        toast.error('Access denied. You must be logged in as Admin.')
      } else {
        toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create product')
      }
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      await api.patch(`/admin/products/${id}`, body)
      await uploadImages(id)
    },
    onSuccess: () => {
      toast.success('Product updated')
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setEditId(null)
      setMainImageFile(null)
      setImageFiles(null)
      reset({ isActive: true, isFeatured: true })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: ({ data }) => {
      toast.success(data?.message || 'Product deleted')
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete product'),
  })

  const uploadImages = async (productId: string) => {
    const allFiles: File[] = []
    if (mainImageFile?.[0]) allFiles.push(mainImageFile[0])
    if (imageFiles) allFiles.push(...Array.from(imageFiles))
    if (allFiles.length === 0) return
    try {
      const formData = new FormData()
      allFiles.forEach((f) => formData.append('files', f))
      await api.post(`/admin/products/${productId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(`${allFiles.length} image(s) uploaded!`)
    } catch (err: any) {
      toast.warning('Product saved, but image upload failed: ' + (err?.response?.data?.message || 'unknown error'))
    }
  }

  const onSubmit = (formData: any) => {
    const payload: any = {
      name: formData.name,
      description: formData.description || undefined,
      brand: formData.brand || undefined,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
      categoryId: formData.categoryId,
      isActive: Boolean(formData.isActive),
      isFeatured: Boolean(formData.isFeatured),
      nameRu: formData.nameRu || undefined,
      nameTg: formData.nameTg || undefined,
      descriptionRu: formData.descriptionRu || undefined,
      descriptionTg: formData.descriptionTg || undefined,
    }
    if (formData.discountPrice && parseFloat(formData.discountPrice) > 0) {
      payload.discountPrice = parseFloat(formData.discountPrice)
    }
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
    setValue('nameRu', product.nameRu || '')
    setValue('nameTg', product.nameTg || '')
    setValue('descriptionRu', product.descriptionRu || '')
    setValue('descriptionTg', product.descriptionTg || '')
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditId(null)
    setMainImageFile(null)
    setImageFiles(null)
    reset({ isActive: true, isFeatured: true })
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

                {/* Translations */}
                <div className="sm:col-span-2 border rounded-lg p-3 bg-muted/20 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Translations (optional)</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium">Name (Russian)</label>
                      <Input {...register('nameRu')} placeholder="Название на русском" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Name (Tajik)</label>
                      <Input {...register('nameTg')} placeholder="Ном ба тоҷикӣ" />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Description (Russian)</label>
                      <textarea className="w-full border rounded-md p-2 text-sm min-h-[60px] bg-background resize-none" placeholder="Описание на русском..." {...register('descriptionRu')} />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Description (Tajik)</label>
                      <textarea className="w-full border rounded-md p-2 text-sm min-h-[60px] bg-background resize-none" placeholder="Тавсиф ба тоҷикӣ..." {...register('descriptionTg')} />
                    </div>
                  </div>
                </div>

                {/* Main image (1 only) */}
                <div>
                  <label className="text-xs font-medium">
                    Main Image <span className="text-destructive">*</span>
                    <span className="text-muted-foreground font-normal ml-1">(1 image, shown in product cards)</span>
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setMainImageFile(e.target.files)}
                    className="h-10 text-sm pt-1.5"
                  />
                  {mainImageFile?.[0] && (
                    <p className="text-xs text-green-600 mt-1">✓ {mainImageFile[0].name}</p>
                  )}
                </div>

                {/* Additional images (multiple) */}
                <div>
                  <label className="text-xs font-medium">
                    Additional Images
                    <span className="text-muted-foreground font-normal ml-1">(multiple, for product detail page)</span>
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setImageFiles(e.target.files)}
                    className="h-10 text-sm pt-1.5"
                  />
                  {imageFiles && imageFiles.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {Array.from(imageFiles).map((f, i) => (
                        <p key={i} className="text-xs text-green-600">✓ {f.name}</p>
                      ))}
                    </div>
                  )}
                  {editId && <p className="text-xs text-muted-foreground mt-1">New images will be added alongside existing ones.</p>}
                </div>

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
      ) : isError ? (
        <div className="text-center py-16 border rounded-xl text-destructive">
          <p className="font-medium">Failed to load products</p>
          <p className="text-sm text-muted-foreground mt-1">
            {(error as any)?.response?.status === 403
              ? 'You are not logged in as Admin. Use admin@shoptaj.com'
              : 'Check that the backend is running'}
          </p>
        </div>
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
