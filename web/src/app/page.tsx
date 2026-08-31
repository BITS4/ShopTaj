'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ProductCard from '@/components/product/ProductCard'
import { useT, useLanguageStore } from '@/store/language.store'
import { ShoppingBag, Truck, Shield, RefreshCw, Star, ArrowRight, Zap } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'
import type { Category, Product } from '@/types'

type LocalisedCategory = Category & {
  nameRu?: string | null
  nameTg?: string | null
  parentId?: string | null
}

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '💻',
  clothing: '👗',
  'home-garden': '🏠',
  books: '📚',
  cosmetics: '💄',
  sports: '⚽',
  food: '🍎',
  toys: '🧸',
  decoration: '🎨',
  automotive: '🚗',
  health: '💊',
  stationery: '✏️',
  pets: '🐾',
  furniture: '🛋️',
}

export default function HomePage() {
  const t = useT()
  const locale = useLanguageStore((s) => s.locale)
  const { user } = useAuthStore()

  const catName = (cat: LocalisedCategory) =>
    locale === 'ru' && cat.nameRu
      ? cat.nameRu
      : locale === 'tg' && cat.nameTg
        ? cat.nameTg
        : cat.name

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['featured'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Product[] }>('/products?limit=8&sortBy=newest')
      return data.data
    },
  })

  const { data: categories } = useQuery<LocalisedCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<LocalisedCategory[]>('/categories')
      return data
    },
  })

  const topCategories = categories?.filter((category) => !category.parentId).slice(0, 6) ?? []

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden gradient-hero py-20 px-4">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

        <div className="container mx-auto max-w-4xl text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="h-3.5 w-3.5" />
            {t.home.hero_badge ?? 'New arrivals every week'}
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter mb-6 leading-[1.05]">
            {t.home.hero_title.split(' ').map((word: string, i: number) => (
              <span key={i} className={i % 3 === 1 ? 'text-gradient' : ''}>
                {word}{' '}
              </span>
            ))}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.home.hero_sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products">
              <Button
                size="lg"
                className="rounded-full px-8 h-12 gradient-primary text-white border-0 shadow-lg hover:shadow-primary/40 hover:opacity-90 transition-all text-base"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                {t.home.shop_now}
              </Button>
            </Link>
            <Link href="/products">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 h-12 text-base border-2 hover:bg-primary/5 transition-all"
              >
                {t.home.view_featured}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-muted-foreground">
            {[
              { icon: Truck, text: t.home.free_shipping ?? 'Free shipping over $50' },
              { icon: Shield, text: t.home.secure ?? 'Secure checkout' },
              { icon: RefreshCw, text: t.home.returns ?? 'Easy returns' },
              { icon: Star, text: t.home.trusted ?? '10k+ happy customers' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      {topCategories.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
                {t.home.browse_label}
              </p>
              <h2 className="text-3xl font-bold">{t.home.shop_by_category}</h2>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {topCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className="group flex flex-col items-center gap-3 p-4 rounded-2xl border bg-card hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                  {CATEGORY_ICONS[cat.slug] ?? '🛍️'}
                </div>
                <span className="text-xs font-semibold text-center leading-tight">
                  {catName(cat)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured Products ─────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-8 pb-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
              {t.home.handpicked_label}
            </p>
            <h2 className="text-3xl font-bold">{t.home.featured_products}</h2>
          </div>
          <Link href="/products">
            <Button
              variant="ghost"
              className="rounded-full gap-1 text-primary font-semibold hover:bg-primary/10"
            >
              {t.home.view_all} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !products?.length ? (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No products yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── Bottom banner — only for guests ─────────────────────────────── */}
      {!user && (
        <section className="gradient-primary py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">{t.home.banner_title}</h2>
            <p className="text-white/80 mb-8 text-lg">{t.home.banner_sub}</p>
            <Link href="/register">
              <Button
                size="lg"
                variant="secondary"
                className="rounded-full px-10 h-12 font-bold text-primary hover:scale-105 transition-transform shadow-xl"
              >
                {t.home.create_account} →
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
