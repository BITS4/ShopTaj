export type Money = number | string

export interface ProductImage {
  id?: string
  url: string
}

export interface Category {
  id: string
  name: string
  slug?: string
}

export interface ProductReview {
  id: string
  rating: number
  comment?: string | null
  user: {
    fullName: string
  }
}

export interface Product {
  id: string
  slug?: string
  name: string
  description?: string | null
  brand?: string | null
  price: Money
  discountPrice?: Money | null
  stock: number
  images?: ProductImage[]
  category?: Category | null
  avgRating?: number | null
  reviewCount?: number
  reviews?: ProductReview[]
  tags?: string[]
}

export interface CartItem {
  id: string
  quantity: number
  product: Product
  variant?: {
    price: Money
  } | null
}

export interface Cart {
  items: CartItem[]
  total: Money
}

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export interface Order {
  id: string
  createdAt: string
  totalAmount: Money
  status: OrderStatus
  items?: Array<{
    productName: string
  }>
}

export interface PaginatedResponse<T> {
  data: T[]
}
