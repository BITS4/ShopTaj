'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ProductCard from '@/components/product/ProductCard'
import { useT } from '@/store/language.store'
import api from '@/lib/api'

export default function HomePage() {
  const t = useT()

  const { data: featured, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featured'],
    queryFn: async () => { const { data } = await api.get('/products/featured'); return data },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await api.get('/categories'); return data },
  })

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-background py-20 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-5xl font-bold tracking-tight mb-6">{t.home.hero_title}</h1>
          <p className="text-xl text-muted-foreground mb-8">{t.home.hero_sub}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products"><Button size="lg" className="px-8">{t.home.shop_now}</Button></Link>
            <Link href="/products?featured=true"><Button size="lg" variant="outline" className="px-8">{t.home.view_featured}</Button></Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories?.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold mb-8">{t.home.shop_by_category}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((cat: any) => (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:border-primary hover:shadow-sm transition-all"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">🛍️</div>
                <span className="text-sm font-medium text-center">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">{t.home.featured_products}</h2>
          <Link href="/products?featured=true">
            <Button variant="ghost">{t.home.view_all} →</Button>
          </Link>
        </div>
        {loadingFeatured ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {featured?.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section className="mx-4 my-16 rounded-2xl bg-primary text-primary-foreground p-12 text-center">
        <h2 className="text-3xl font-bold mb-4">{t.home.cta_title}</h2>
        <p className="mb-6 opacity-90">{t.home.cta_sub}</p>
        <Link href="/register"><Button variant="secondary" size="lg">{t.home.create_account}</Button></Link>
      </section>
    </div>
  )
}
