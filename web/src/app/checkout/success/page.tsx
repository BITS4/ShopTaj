'use client'
import { Suspense } from 'react'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/cart.store'
import { useT, useLanguageStore } from '@/store/language.store'

type BankInfo = {
  title: string
  message: string
  app: string
  appSteps: string[]
  transfer: string
  transferSteps: string[]
  contact: string
}

type Translations = ReturnType<typeof useT>

const ALIF: Record<string, BankInfo> = {
  en: {
    title: 'Order Placed! Pay via Alif Bank',
    message: 'Your order is reserved for 24 hours. Complete payment to confirm.',
    app: '📱 Option 1 — Alif Mobi app (fastest)',
    appSteps: [
      'Open Alif Mobi',
      'Tap Transfers → By phone number or card',
      'Enter the exact amount',
      'Add your Order ID as the note',
    ],
    transfer: '🏦 Option 2 — Bank transfer to Alif Bank',
    transferSteps: [
      'Bank: Alif Bank (alif.tj)',
      'Account holder: ShopTaj',
      'IBAN: [your Alif IBAN here]',
      'Reference: Order ID (below)',
    ],
    contact: 'Questions? Telegram or call +992 900 000 000',
  },
  ru: {
    title: 'Заказ оформлен! Оплатите через Alif Bank',
    message: 'Заказ зарезервирован на 24 часа. Оплатите для подтверждения.',
    app: '📱 Способ 1 — Приложение Alif Mobi (быстрее)',
    appSteps: [
      'Откройте Alif Mobi',
      'Переводы → По номеру телефона или карте',
      'Введите точную сумму',
      'В комментарии укажите ID заказа',
    ],
    transfer: '🏦 Способ 2 — Банковский перевод в Alif Bank',
    transferSteps: [
      'Банк: Alif Bank (alif.tj)',
      'Получатель: ShopTaj',
      'IBAN: [ваш IBAN в Alif Bank]',
      'Назначение платежа: ID заказа (ниже)',
    ],
    contact: 'Вопросы? Telegram или телефон: +992 900 000 000',
  },
  tg: {
    title: 'Фармоиш қабул! Тавассути Alif Bank пардохт кунед',
    message: 'Фармоиши шумо 24 соат нигоҳ дошта мешавад. Барои тасдиқ пардохт кунед.',
    app: '📱 Роҳи 1 — Барномаи Alif Mobi (тезтар)',
    appSteps: [
      'Alif Mobi-ро кушоед',
      'Интиқолот → Ба рақами телефон ё корт',
      'Маблағи дақиқро ворид кунед',
      'ID фармоишро дар тавзеҳот нависед',
    ],
    transfer: '🏦 Роҳи 2 — Интиқоли бонкӣ ба Alif Bank',
    transferSteps: [
      'Бонк: Alif Bank (alif.tj)',
      'Гиранда: ShopTaj',
      'IBAN: [IBAN-и Alif Bank-ро ворид кунед]',
      'Мақсад: ID фармоиш (поён)',
    ],
    contact: 'Саволҳо? Telegram ё занг: +992 900 000 000',
  },
}

const DC: Record<string, BankInfo> = {
  en: {
    title: 'Order Placed! Pay via DC Bank',
    message: 'Your order is reserved for 24 hours. Complete payment to confirm.',
    app: '📱 Option 1 — DC Next app (fastest)',
    appSteps: [
      'Open the DC Next app',
      'Tap Transfers → By card or account',
      'Enter the exact amount',
      'Add your Order ID as the note',
    ],
    transfer: '🏦 Option 2 — Bank transfer to Dushanbe City Bank',
    transferSteps: [
      'Bank: Dushanbe City Bank (dc.tj)',
      'Account holder: ShopTaj',
      'IBAN: [your DC Bank IBAN here]',
      'Reference: Order ID (below)',
    ],
    contact: 'Questions? Telegram or call +992 900 000 000',
  },
  ru: {
    title: 'Заказ оформлен! Оплатите через DC Bank',
    message: 'Заказ зарезервирован на 24 часа. Оплатите для подтверждения.',
    app: '📱 Способ 1 — Приложение DC Next (быстрее)',
    appSteps: [
      'Откройте приложение DC Next',
      'Переводы → По карте или счёту',
      'Введите точную сумму',
      'В комментарии укажите ID заказа',
    ],
    transfer: '🏦 Способ 2 — Банковский перевод в Dushanbe City Bank',
    transferSteps: [
      'Банк: Dushanbe City Bank (dc.tj)',
      'Получатель: ShopTaj',
      'IBAN: [ваш IBAN в DC Bank]',
      'Назначение платежа: ID заказа (ниже)',
    ],
    contact: 'Вопросы? Telegram или телефон: +992 900 000 000',
  },
  tg: {
    title: 'Фармоиш қабул! Тавассути DC Bank пардохт кунед',
    message: 'Фармоиши шумо 24 соат нигоҳ дошта мешавад. Барои тасдиқ пардохт кунед.',
    app: '📱 Роҳи 1 — Барномаи DC Next (тезтар)',
    appSteps: [
      'DC Next-ро кушоед',
      'Интиқолот → Ба корт ё ҳисоб',
      'Маблағи дақиқро ворид кунед',
      'ID фармоишро дар тавзеҳот нависед',
    ],
    transfer: '🏦 Роҳи 2 — Интиқоли бонкӣ ба Dushanbe City Bank',
    transferSteps: [
      'Бонк: Dushanbe City Bank (dc.tj)',
      'Гиранда: ShopTaj',
      'IBAN: [IBAN-и DC Bank-ро ворид кунед]',
      'Мақсад: ID фармоиш (поён)',
    ],
    contact: 'Саволҳо? Telegram ё занг: +992 900 000 000',
  },
}

function BankSuccessPage({
  info,
  orderId,
  t,
}: {
  info: BankInfo
  orderId: string | null
  t: Translations
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="text-left space-y-5 max-w-lg w-full">
        <div className="text-center">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-bold">{info.title}</h1>
          <p className="text-muted-foreground mt-1">{info.message}</p>
        </div>

        {orderId && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Order ID</p>
            <p className="font-mono font-bold text-xl tracking-wider">
              {orderId.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Use this as reference when paying</p>
          </div>
        )}

        <div className="border rounded-xl p-4 bg-green-50 border-green-200 space-y-2">
          <p className="font-semibold text-green-800">{info.app}</p>
          {info.appSteps.map((s, i) => (
            <p key={i} className="text-sm text-green-700">
              <span className="font-semibold text-green-900">{i + 1}.</span> {s}
            </p>
          ))}
        </div>

        <div className="border rounded-xl p-4 bg-blue-50 border-blue-200 space-y-2">
          <p className="font-semibold text-blue-800">{info.transfer}</p>
          {info.transferSteps.map((s, i) => (
            <p key={i} className="text-sm text-blue-700">
              • {s}
            </p>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">{info.contact}</p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/profile/orders" className="flex-1">
            <Button className="w-full">{t.success.view_orders}</Button>
          </Link>
          <Link href="/products" className="flex-1">
            <Button variant="outline" className="w-full">
              {t.success.continue}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function CheckoutSuccessPage() {
  const t = useT()
  const { locale } = useLanguageStore()
  const qc = useQueryClient()
  const { setCart } = useCartStore()
  const searchParams = useSearchParams()
  const method = searchParams.get('method')
  const orderId = searchParams.get('orderId')

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ['cart'] })
    qc.invalidateQueries({ queryKey: ['orders'] })
    setCart({ id: '', items: [], total: 0 })
  }, [])

  if (method === 'korti_milli' || method === 'bank') {
    return <BankSuccessPage info={ALIF[locale] ?? ALIF.en} orderId={orderId} t={t} />
  }

  if (method === 'dc_bank') {
    return <BankSuccessPage info={DC[locale] ?? DC.en} orderId={orderId} t={t} />
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-7xl">🎉</div>
        <h1 className="text-3xl font-bold">{t.success.title}</h1>
        <p className="text-muted-foreground">{t.success.message}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/profile/orders">
            <Button>{t.success.view_orders}</Button>
          </Link>
          <Link href="/products">
            <Button variant="outline">{t.success.continue}</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPageWithSuspense() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessPage />
    </Suspense>
  )
}
