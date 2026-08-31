import { describe, expect, it } from 'vitest'
import { toProductFormValues, toProductPayload } from '../product-form'
import type { AdminProduct, ProductFormValues } from '@/types'

describe('admin product form mapping', () => {
  it('normalizes numeric fields, optional fields, and comma-separated tags for the API', () => {
    const values: ProductFormValues = {
      name: 'Wireless Headphones',
      brand: '',
      description: '',
      price: '249.50',
      discountPrice: '0',
      stock: '12',
      categoryId: 'audio',
      tags: ' wireless, audio, wireless , ',
      isActive: true,
      isFeatured: false,
      nameRu: '',
      nameTg: '',
      descriptionRu: '',
      descriptionTg: '',
    }

    expect(toProductPayload(values)).toEqual({
      name: 'Wireless Headphones',
      brand: undefined,
      description: undefined,
      price: 249.5,
      discountPrice: null,
      stock: 12,
      categoryId: 'audio',
      tags: ['wireless', 'audio', 'wireless'],
      isActive: true,
      isFeatured: false,
      nameRu: undefined,
      nameTg: undefined,
      descriptionRu: undefined,
      descriptionTg: undefined,
    })
  })

  it('maps an existing product into editable form values', () => {
    const product: AdminProduct = {
      id: 'product-1',
      name: 'Phone',
      price: 1000,
      discountPrice: 900,
      stock: 4,
      categoryId: 'phones',
      tags: ['mobile', 'android'],
      isActive: true,
      isFeatured: true,
    }

    expect(toProductFormValues(product)).toMatchObject({
      name: 'Phone',
      brand: '',
      description: '',
      discountPrice: 900,
      tags: 'mobile, android',
      nameRu: '',
      descriptionTg: '',
    })
  })
})
