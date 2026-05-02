'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/cart.store'
import { useLanguageStore } from '@/store/language.store'
import api from '@/lib/api'

const LABELS = {
  en: {
    checking: 'Checking payment status…',
    success_title: 'Payment Successful!',
    success_msg: 'Your order has been confirmed and is being prepared.',
    fail_title: 'Payment Not Completed',
    fail_msg: 'The payment was cancelled or failed. Your order has been cancelled. Please try again.',
    view_orders: 'View My Orders',
    try_again: 'Try Again',
    continue: 'Continue Shopping',
  },
  ru: {
    checking: 'Проверяем статус оплаты…',
    success_title: 'Оплата прошла успешно!',
    success_msg: 'Ваш заказ подтверждён и готовится к отправке.',
    fail_title: 'Оплата не завершена',
    fail_msg: 'Оплата была отменена или произошла ошибка. Заказ отменён. Пожалуйста, попробуйте снова.',
    view_orders: 'Мои заказы',
    try_again: 'Попробовать снова',
    continue: 'Продолжить покупки',
  },
  tg: {
    checking: 'Вазъи пардохтро тафтиш мекунем…',
    success_title: 'Пардохт муваффақ шуд!',
    success_msg: 'Фармоиши шумо тасдиқ шуд.',
    fail_title: 'Пардохт анҷом наёфт',
    fail_msg: 'Пардохт бекор шуд ё хато рух дод. Фармоиш бекор карда шуд.',
    view_orders: 'Фармоишҳоям',
    try_again: 'Аз нав кӯшиш кунед',
    continue: 'Харид идома диҳед',
  },
}

export default function BePaidReturnPage() {
  const searchParams = useSearchParams()
  const qc = useQueryClient()
  const { setCart } = useCartStore()
  const { locale } = useLanguageStore()
  const L = LABELS[locale] ?? LABELS.en

  const orderId = searchParams.get('orderId')
  const failed = searchParams.get('failed') === '1'

  const [status, setStatus] = useState<'loading' | 'success' | 'fail'>('loading')

  useEffect(() => {
    if (failed) { setStatus('fail'); return }
    if (!orderId) { setStatus('fail'); return }

    // Poll for order payment status (webhook may arrive slightly after redirect)
    let attempts = 0
    const check = async () => {
      try {
        const { data: order } = await api.get(`/orders/${orderId}`)
        if (order.paymentStatus === 'PAID') {
          setStatus('success')
          setCart({ id: '', items: [], total: 0 })
          qc.invalidateQueries({ queryKey: ['cart'] })
          qc.invalidateQueries({ queryKey: ['orders'] })
        } else if (order.status === 'CANCELLED') {
          setStatus('fail')
        } else if (attempts < 6) {
          // Webhook may not have fired yet — retry up to 6 times (12s)
          attempts++
          setTimeout(check, 2000)
        } else {
          // After 12s, assume success (webhook fires in background)
          setStatus('success')
          setCart({ id: '', items: [], total: 0 })
          qc.invalidateQueries({ queryKey: ['cart'] })
          qc.invalidateQueries({ queryKey: ['orders'] })
        }
      } catch {
        setStatus('fail')
      }
    }
    check()
  }, [orderId, failed])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">{L.checking}</p>
        </div>
      </div>
    )
  }

  if (status === 'fail') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl">❌</div>
          <h1 className="text-2xl font-bold text-destructive">{L.fail_title}</h1>
          <p className="text-muted-foreground">{L.fail_msg}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/checkout"><Button variant="destructive">{L.try_again}</Button></Link>
            <Link href="/products"><Button variant="outline">{L.continue}</Button></Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-7xl">🎉</div>
        <h1 className="text-3xl font-bold">{L.success_title}</h1>
        <p className="text-muted-foreground">{L.success_msg}</p>
        {orderId && (
          <div className="bg-muted rounded-lg px-4 py-2 text-sm inline-block">
            Order: <span className="font-mono font-bold">{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/profile/orders"><Button>{L.view_orders}</Button></Link>
          <Link href="/products"><Button variant="outline">{L.continue}</Button></Link>
        </div>
      </div>
    </div>
  )
}
