export interface User {
  id: string
  email: string
  fullName: string
  phone?: string
  avatarUrl?: string
  role: 'USER' | 'SELLER' | 'ADMIN'
  isEmailVerified: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  imageUrl?: string
  children?: Category[]
}

export interface ProductImage {
  id: string
  url: string
  isMain: boolean
}

export interface ProductVariant {
  id: string
  size?: string
  color?: string
  sku: string
  stock: number
  price?: number
}

export interface Product {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  discountPrice?: number
  stock: number
  isFeatured: boolean
  brand?: string
  tags: string[]
  category: Category
  images: ProductImage[]
  variants: ProductVariant[]
  avgRating?: number
  reviewCount?: number
}

export interface CartItem {
  id: string
  product: Product
  variant?: ProductVariant
  quantity: number
}

export interface Cart {
  id: string
  items: CartItem[]
  total: number
}

export interface Address {
  id: string
  label: string
  street: string
  city: string
  state?: string
  country: string
  zip: string
  isDefault: boolean
}

export type PaymentMethod = 'card' | 'korti_milli' | 'dc_bank'

export interface CheckoutPaymentData {
  clientSecret: string
  paymentIntentId: string
  subtotal: number
  shippingAmount: number
  discountAmount: number
  totalAmount: number
}

export interface ProductFormValues {
  name: string
  brand: string
  description: string
  price: string | number
  discountPrice: string | number
  stock: string | number
  categoryId: string
  tags: string
  isActive: boolean
  isFeatured: boolean
  nameRu: string
  nameTg: string
  descriptionRu: string
  descriptionTg: string
}

export interface ProductPayload {
  name: string
  description?: string
  brand?: string
  price: number
  discountPrice: number | null
  stock: number
  categoryId: string
  tags: string[]
  isActive: boolean
  isFeatured: boolean
  nameRu?: string
  nameTg?: string
  descriptionRu?: string
  descriptionTg?: string
}

export interface AdminProduct extends ProductPayload {
  id: string
  category?: Pick<Category, 'id' | 'name'>
}

export interface Order {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  paymentStatus: 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED'
  totalAmount: number
  shippingAmount: number
  discountAmount: number
  items: OrderItem[]
  shippingAddress?: Address
  createdAt: string
}

export interface OrderItem {
  id: string
  product: Product
  variant?: ProductVariant
  quantity: number
  priceAtPurchase: number
  productName: string
  productImage?: string
}

export interface Review {
  id: string
  user: { id: string; fullName: string; avatarUrl?: string }
  rating: number
  comment?: string
  createdAt: string
}

export interface Coupon {
  id: string
  code: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  isActive: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages?: number }
}
