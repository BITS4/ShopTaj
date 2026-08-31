'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AdminProductForm } from '@/components/admin/products/AdminProductForm'
import { AdminProductsTable } from '@/components/admin/products/AdminProductsTable'
import {
  PRODUCT_FORM_DEFAULTS,
  toProductFormValues,
  toProductPayload,
} from '@/components/admin/products/product-form'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api-error'
import type { AdminProduct, Category, ProductFormValues, ProductPayload } from '@/types'

export default function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [mainImageFile, setMainImageFile] = useState<FileList | null>(null)
  const [imageFiles, setImageFiles] = useState<FileList | null>(null)
  const form = useForm<ProductFormValues>({ defaultValues: PRODUCT_FORM_DEFAULTS })

  const productsQuery = useQuery<AdminProduct[]>({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data } = await api.get('/admin/products-list')
      return data
    },
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories')
      return data
    },
  })

  async function uploadImages(productId: string) {
    const allFiles: File[] = []
    if (mainImageFile?.[0]) allFiles.push(mainImageFile[0])
    if (imageFiles) allFiles.push(...Array.from(imageFiles))
    if (allFiles.length === 0) return

    try {
      const formData = new FormData()
      allFiles.forEach((file) => formData.append('files', file))
      await api.post(`/admin/products/${productId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(`${allFiles.length} image(s) uploaded!`)
    } catch (error: unknown) {
      toast.warning(
        `Product saved, but image upload failed: ${getApiErrorMessage(error, 'unknown error')}`,
      )
    }
  }

  const createProduct = useMutation({
    mutationFn: async (body: ProductPayload) => {
      const { data: product } = await api.post('/admin/products', body)
      await uploadImages(product.id)
      return product
    },
    onSuccess: () => {
      toast.success('Product created!')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setShowForm(false)
      setMainImageFile(null)
      setImageFiles(null)
      form.reset(PRODUCT_FORM_DEFAULTS)
    },
    onError: (error: unknown) => {
      if (getApiErrorStatus(error) === 403) {
        toast.error('Access denied. You must be logged in as Admin.')
      } else {
        toast.error(getApiErrorMessage(error, 'Failed to create product'))
      }
    },
  })

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...body }: ProductPayload & { id: string }) => {
      await api.patch(`/admin/products/${id}`, body)
      await uploadImages(id)
    },
    onSuccess: () => {
      toast.success('Product updated')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setEditId(null)
      setMainImageFile(null)
      setImageFiles(null)
      form.reset(PRODUCT_FORM_DEFAULTS)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to update'))
    },
  })

  const removeProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: ({ data }) => {
      toast.success(data?.message || 'Product deleted')
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete product'))
    },
  })

  const resetForm = () => {
    setShowForm(false)
    setEditId(null)
    setMainImageFile(null)
    setImageFiles(null)
    form.reset(PRODUCT_FORM_DEFAULTS)
  }

  const startEdit = (product: AdminProduct) => {
    setEditId(product.id)
    setShowForm(false)
    setMainImageFile(null)
    setImageFiles(null)
    form.reset(toProductFormValues(product))
  }

  const submitProduct = (values: ProductFormValues) => {
    const payload = toProductPayload(values)
    if (editId) updateProduct.mutate({ id: editId, ...payload })
    else createProduct.mutate(payload)
  }

  const confirmDelete = (product: AdminProduct) => {
    if (confirm(`Delete "${product.name}"?`)) removeProduct.mutate(product.id)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {(showForm || editId) && (
        <AdminProductForm
          categories={categories}
          editId={editId}
          form={form}
          imageFiles={imageFiles}
          isSaving={createProduct.isPending || updateProduct.isPending}
          mainImageFile={mainImageFile}
          onCancel={resetForm}
          onSubmit={submitProduct}
          setImageFiles={setImageFiles}
          setMainImageFile={setMainImageFile}
        />
      )}

      {!categories?.length && (
        <div className="mb-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          No categories found. Go to{' '}
          <a href="/admin" className="underline font-medium">
            Admin → Categories
          </a>{' '}
          to create one before adding products.
        </div>
      )}

      <AdminProductsTable
        error={productsQuery.error}
        isError={productsQuery.isError}
        isLoading={productsQuery.isLoading}
        onDelete={confirmDelete}
        onEdit={startEdit}
        products={productsQuery.data}
      />
    </div>
  )
}
