import type { Dispatch, SetStateAction } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Category, ProductFormValues } from '@/types'

interface AdminProductFormProps {
  categories?: Category[]
  editId: string | null
  form: UseFormReturn<ProductFormValues>
  imageFiles: FileList | null
  isSaving: boolean
  mainImageFile: FileList | null
  onCancel: () => void
  onSubmit: (values: ProductFormValues) => void
  setImageFiles: Dispatch<SetStateAction<FileList | null>>
  setMainImageFile: Dispatch<SetStateAction<FileList | null>>
}

export function AdminProductForm({
  categories,
  editId,
  form,
  imageFiles,
  isSaving,
  mainImageFile,
  onCancel,
  onSubmit,
  setImageFiles,
  setMainImageFile,
}: AdminProductFormProps) {
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = form

  return (
    <Card className="mb-8 border-primary/30">
      <CardHeader>
        <CardTitle>{editId ? 'Edit Product' : 'New Product'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="admin-product-name" className="text-xs font-medium">
                Name *
              </label>
              <Input
                id="admin-product-name"
                {...register('name', { required: 'Name is required' })}
                placeholder="Product name"
                required
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'admin-product-name-error' : undefined}
              />
              <FieldError id="admin-product-name-error" message={errors.name?.message} />
            </div>
            <div>
              <label htmlFor="admin-product-brand" className="text-xs font-medium">
                Brand
              </label>
              <Input
                id="admin-product-brand"
                {...register('brand')}
                placeholder="e.g. Nike, Apple"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="admin-product-description" className="text-xs font-medium">
                Description
              </label>
              <textarea
                id="admin-product-description"
                className="w-full border rounded-md p-2 text-sm min-h-[80px] bg-background resize-none"
                placeholder="Product description..."
                {...register('description')}
              />
            </div>

            <div>
              <label htmlFor="admin-product-price" className="text-xs font-medium">
                Price (TJS) *
              </label>
              <Input
                id="admin-product-price"
                type="number"
                step="0.01"
                min="0"
                {...register('price', { required: 'Price is required' })}
                placeholder="0.00"
                required
                aria-invalid={Boolean(errors.price)}
                aria-describedby={errors.price ? 'admin-product-price-error' : undefined}
              />
              <FieldError id="admin-product-price-error" message={errors.price?.message} />
            </div>
            <div>
              <label htmlFor="admin-product-discount-price" className="text-xs font-medium">
                Discount Price (leave empty for no sale)
              </label>
              <Input
                id="admin-product-discount-price"
                type="number"
                step="0.01"
                min="0"
                {...register('discountPrice')}
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="admin-product-stock" className="text-xs font-medium">
                Stock *
              </label>
              <Input
                id="admin-product-stock"
                type="number"
                min="0"
                {...register('stock', { required: 'Stock is required' })}
                placeholder="0"
                required
                aria-invalid={Boolean(errors.stock)}
                aria-describedby={errors.stock ? 'admin-product-stock-error' : undefined}
              />
              <FieldError id="admin-product-stock-error" message={errors.stock?.message} />
            </div>
            <div>
              <label htmlFor="admin-product-category" className="text-xs font-medium">
                Category *
              </label>
              <select
                id="admin-product-category"
                className="w-full h-10 border rounded-md px-3 text-sm bg-background"
                {...register('categoryId', { required: 'Category is required' })}
                required
                aria-invalid={Boolean(errors.categoryId)}
                aria-describedby={errors.categoryId ? 'admin-product-category-error' : undefined}
              >
                <option value="">-- Select category --</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                {!categories?.length && (
                  <option disabled>No categories yet — create one first</option>
                )}
              </select>
              <FieldError id="admin-product-category-error" message={errors.categoryId?.message} />
            </div>

            <div>
              <label htmlFor="admin-product-tags" className="text-xs font-medium">
                Tags <span className="text-muted-foreground">(comma separated)</span>
              </label>
              <Input
                id="admin-product-tags"
                {...register('tags')}
                placeholder="electronics, wireless, bluetooth"
              />
            </div>

            <div className="sm:col-span-2 border rounded-lg p-3 bg-muted/20 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Translations (optional)
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="admin-product-name-ru" className="text-xs font-medium">
                    Name (Russian)
                  </label>
                  <Input
                    id="admin-product-name-ru"
                    {...register('nameRu')}
                    placeholder="Название на русском"
                  />
                </div>
                <div>
                  <label htmlFor="admin-product-name-tg" className="text-xs font-medium">
                    Name (Tajik)
                  </label>
                  <Input
                    id="admin-product-name-tg"
                    {...register('nameTg')}
                    placeholder="Ном ба тоҷикӣ"
                  />
                </div>
                <div>
                  <label htmlFor="admin-product-description-ru" className="text-xs font-medium">
                    Description (Russian)
                  </label>
                  <textarea
                    id="admin-product-description-ru"
                    className="w-full border rounded-md p-2 text-sm min-h-[60px] bg-background resize-none"
                    placeholder="Описание на русском..."
                    {...register('descriptionRu')}
                  />
                </div>
                <div>
                  <label htmlFor="admin-product-description-tg" className="text-xs font-medium">
                    Description (Tajik)
                  </label>
                  <textarea
                    id="admin-product-description-tg"
                    className="w-full border rounded-md p-2 text-sm min-h-[60px] bg-background resize-none"
                    placeholder="Тавсиф ба тоҷикӣ..."
                    {...register('descriptionTg')}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="admin-product-main-image" className="text-xs font-medium">
                Main Image <span className="text-destructive">*</span>
                <span className="text-muted-foreground font-normal ml-1">
                  (1 image, shown in product cards)
                </span>
              </label>
              <Input
                id="admin-product-main-image"
                type="file"
                accept="image/*"
                required={!editId}
                aria-required={!editId}
                onChange={(event) => setMainImageFile(event.target.files)}
                className="h-10 text-sm pt-1.5"
              />
              {mainImageFile?.[0] && (
                <p className="text-xs text-green-600 mt-1">✓ {mainImageFile[0].name}</p>
              )}
            </div>

            <div>
              <label htmlFor="admin-product-images" className="text-xs font-medium">
                Additional Images
                <span className="text-muted-foreground font-normal ml-1">
                  (multiple, for product detail page)
                </span>
              </label>
              <Input
                id="admin-product-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => setImageFiles(event.target.files)}
                className="h-10 text-sm pt-1.5"
              />
              {imageFiles && imageFiles.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {Array.from(imageFiles).map((file) => (
                    <p key={file.name} className="text-xs text-green-600">
                      ✓ {file.name}
                    </p>
                  ))}
                </div>
              )}
              {editId && (
                <p className="text-xs text-muted-foreground mt-1">
                  New images will be added alongside existing ones.
                </p>
              )}
            </div>

            <div className="flex items-center gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Active{' '}
                  <span className="text-muted-foreground font-normal">(visible to customers)</span>
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('isFeatured')} className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Featured{' '}
                  <span className="text-muted-foreground font-normal">(shown on homepage)</span>
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : editId ? 'Update Product' : 'Create Product'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <p id={id} role="alert" className="mt-1 text-xs text-destructive">
      {message}
    </p>
  )
}
