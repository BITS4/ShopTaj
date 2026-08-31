'use client'
import { Suspense } from 'react'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import ProductCard from '@/components/product/ProductCard'
import { useT, useLanguageStore } from '@/store/language.store'
import api from '@/lib/api'
import type { Category, Product } from '@/types'

type LocalisedCategory = Category & {
  nameRu?: string | null
  nameTg?: string | null
}

interface CatalogResponse {
  data: Product[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

function ProductsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useT()
  const locale = useLanguageStore((s) => s.locale)
  const [showFilters, setShowFilters] = useState(false)

  const catName = (cat: LocalisedCategory) =>
    locale === 'ru' && cat.nameRu
      ? cat.nameRu
      : locale === 'tg' && cat.nameTg
        ? cat.nameTg
        : cat.name

  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('categoryId') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'newest'
  const page = Number(searchParams.get('page') ?? 1)
  const minPrice = searchParams.get('minPrice') ?? ''
  const maxPrice = searchParams.get('maxPrice') ?? ''

  const [localMin, setLocalMin] = useState(minPrice)
  const [localMax, setLocalMax] = useState(maxPrice)

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`/products?${params.toString()}`)
  }

  const SORT_OPTIONS = [
    { label: t.products.sort_newest, value: 'newest' },
    { label: t.products.sort_price_asc, value: 'price_asc' },
    { label: t.products.sort_price_desc, value: 'price_desc' },
    { label: t.products.sort_rating, value: 'rating' },
  ]

  const { data, isLoading } = useQuery<CatalogResponse>({
    queryKey: ['products', search, categoryId, sortBy, page, minPrice, maxPrice],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryId) params.set('categoryId', categoryId)
      if (sortBy) params.set('sortBy', sortBy)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)
      params.set('page', String(page))
      params.set('limit', '20')
      const { data } = await api.get<CatalogResponse>(`/products?${params}`)
      return data
    },
  })

  const { data: categories } = useQuery<LocalisedCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<LocalisedCategory[]>('/categories')
      return data
    },
  })

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (localMin) params.set('minPrice', localMin)
    else params.delete('minPrice')
    if (localMax) params.set('maxPrice', localMax)
    else params.delete('maxPrice')
    params.delete('page')
    router.push(`/products?${params.toString()}`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {search ? `${t.products.results_for} "${search}"` : t.products.title}
          {data && (
            <span className="text-base font-normal text-muted-foreground ml-2">
              ({data.meta.total} {t.products.results})
            </span>
          )}
        </h1>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {t.products.filters}
          </Button>
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={sortBy}
            onChange={(e) => setParam('sortBy', e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filters sidebar */}
        {showFilters && (
          <aside className="w-56 shrink-0 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">{t.products.category}</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setParam('categoryId', '')}
                  className={`block text-sm w-full text-left px-2 py-1 rounded hover:bg-muted ${!categoryId ? 'font-semibold text-primary' : ''}`}
                >
                  {t.products.all}
                </button>
                {categories?.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setParam('categoryId', cat.id)}
                    className={`block text-sm w-full text-left px-2 py-1 rounded hover:bg-muted ${categoryId === cat.id ? 'font-semibold text-primary' : ''}`}
                  >
                    {catName(cat)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">{t.products.price_range}</h3>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Min"
                  value={localMin}
                  onChange={(e) => setLocalMin(e.target.value)}
                  className="h-8 text-sm"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  placeholder="Max"
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button size="sm" className="w-full mt-2" onClick={applyPriceFilter}>
                {t.products.apply}
              </Button>
              {(minPrice || maxPrice) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-1"
                  onClick={() => {
                    setLocalMin('')
                    setLocalMax('')
                    setParam('minPrice', '')
                  }}
                >
                  <X className="h-3 w-3 mr-1" /> {t.products.clear}
                </Button>
              )}
            </div>
          </aside>
        )}

        {/* Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <p className="text-lg">{t.products.no_products}</p>
              <Button variant="ghost" className="mt-4" onClick={() => router.push('/products')}>
                {t.products.clear_filters}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {data?.data.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {(data?.meta.totalPages ?? 0) > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: data?.meta.totalPages ?? 0 }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={p === page ? 'default' : 'outline'}
                      onClick={() => setParam('page', String(p))}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductsPageWithSuspense() {
  return (
    <Suspense fallback={null}>
      <ProductsPage />
    </Suspense>
  )
}
