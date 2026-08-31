import type { AdminProduct, ProductFormValues, ProductPayload } from '@/types'

export const PRODUCT_FORM_DEFAULTS: Partial<ProductFormValues> = {
  isActive: true,
  isFeatured: true,
}

export function toProductPayload(formData: ProductFormValues): ProductPayload {
  const discountPrice = Number(formData.discountPrice)

  return {
    name: formData.name,
    description: formData.description || undefined,
    brand: formData.brand || undefined,
    price: Number(formData.price),
    discountPrice: discountPrice > 0 ? discountPrice : null,
    stock: Number.parseInt(String(formData.stock), 10),
    categoryId: formData.categoryId,
    tags: (formData.tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    isActive: Boolean(formData.isActive),
    isFeatured: Boolean(formData.isFeatured),
    nameRu: formData.nameRu || undefined,
    nameTg: formData.nameTg || undefined,
    descriptionRu: formData.descriptionRu || undefined,
    descriptionTg: formData.descriptionTg || undefined,
  }
}

export function toProductFormValues(product: AdminProduct): ProductFormValues {
  return {
    name: product.name,
    brand: product.brand || '',
    description: product.description || '',
    price: product.price,
    discountPrice: product.discountPrice || '',
    stock: product.stock,
    categoryId: product.categoryId,
    tags: (product.tags || []).join(', '),
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    nameRu: product.nameRu || '',
    nameTg: product.nameTg || '',
    descriptionRu: product.descriptionRu || '',
    descriptionTg: product.descriptionTg || '',
  }
}
