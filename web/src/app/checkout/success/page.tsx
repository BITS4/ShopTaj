'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useT } from '@/store/language.store'

export default function CheckoutSuccessPage() {
  const t = useT()
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-7xl">🎉</div>
        <h1 className="text-3xl font-bold">{t.success.title}</h1>
        <p className="text-muted-foreground">{t.success.message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/profile/orders"><Button>{t.success.view_orders}</Button></Link>
          <Link href="/products"><Button variant="outline">{t.success.continue}</Button></Link>
        </div>
      </div>
    </div>
  )
}
