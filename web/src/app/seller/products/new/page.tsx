'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Upload } from 'lucide-react'

export default function NewSellerProductPage() {
  const router = useRouter()
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    defaultValues: { isActive: true, stock: 0 },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await api.get('/categories'); return data },
  })

  const createProduct = useMutation({
    mutationFn: async (data: any) => {
      const { data: product } = await api.post('/seller/products', data)
      if (imageFiles?.length) {
        const fd = new FormData()
        Array.from(imageFiles).forEach((f) => fd.append('files', f))
        await api.post(`/seller/products/${product.id}/images`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      return product
    },
    onSuccess: () => {
      toast.success('Product created!')
      router.push('/seller/products')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create product'),
  })

  const onSubmit = (data: any) => {
    createProduct.mutate({
      ...data,
      price: parseFloat(data.price),
      stock: parseInt(data.stock),
      discountPrice: data.discountPrice ? parseFloat(data.discountPrice) : undefined,
      tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    })
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      <Card>
        <CardHeader><CardTitle>Product Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Product Name *</label>
              <Input {...register('name', { required: true })} placeholder="e.g. Handmade Silk Scarf" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Price (сом) *</label>
                <Input type="number" step="0.01" {...register('price', { required: true })} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Discount Price</label>
                <Input type="number" step="0.01" {...register('discountPrice')} placeholder="0.00" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Stock *</label>
                <Input type="number" {...register('stock', { required: true })} placeholder="0" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Category *</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  {...register('categoryId', { required: true })}
                >
                  <option value="">Select category</option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                {...register('description')}
                placeholder="Describe your product..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Brand</label>
              <Input {...register('brand')} placeholder="Brand name" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input {...register('tags')} placeholder="silk, handmade, scarf" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Product Images</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">
                  {imageFiles?.length ? `${imageFiles.length} file(s) selected` : 'Click to upload images'}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFiles(e.target.files)}
                />
              </label>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending ? 'Creating...' : 'Create Product'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
