'use client'
import { ShoppingBag, Package, Truck, CheckCircle, XCircle } from 'lucide-react'
import { useLanguageStore } from '@/store/language.store'

const STEPS = [
  { key: 'PENDING',    icon: ShoppingBag },
  { key: 'PROCESSING', icon: Package },
  { key: 'SHIPPED',    icon: Truck },
  { key: 'DELIVERED',  icon: CheckCircle },
]

const LABELS: Record<string, Record<string, string>> = {
  en: { PENDING: 'Order Placed', PROCESSING: 'Processing', SHIPPED: 'Shipped', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' },
  ru: { PENDING: 'Заказ оформлен', PROCESSING: 'Обработка', SHIPPED: 'Отправлен', DELIVERED: 'Доставлен', CANCELLED: 'Отменён' },
  tg: { PENDING: 'Фармоиш қабул', PROCESSING: 'Коркард', SHIPPED: 'Фиристода шуд', DELIVERED: 'Расид', CANCELLED: 'Бекор шуд' },
}

export default function OrderTracker({ status }: { status: string }) {
  const { locale } = useLanguageStore()
  const labels = LABELS[locale] ?? LABELS.en

  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4">
        <XCircle className="h-6 w-6 text-destructive shrink-0" />
        <span className="font-semibold text-destructive">{labels.CANCELLED}</span>
      </div>
    )
  }

  const activeIndex = STEPS.findIndex((s) => s.key === status)

  return (
    <div className="rounded-xl border p-5">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-5">
        {locale === 'ru' ? 'Статус заказа' : locale === 'tg' ? 'Вазъи фармоиш' : 'Track Your Order'}
      </h2>
      <div className="relative flex items-start justify-between">
        {/* Connecting line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted-foreground/20 -z-0" />
        <div
          className="absolute top-5 left-5 h-0.5 bg-primary transition-all duration-500 -z-0"
          style={{ width: activeIndex <= 0 ? '0%' : `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, i) => {
          const Icon = step.icon
          const done = i <= activeIndex
          const active = i === activeIndex

          return (
            <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  done
                    ? active
                      ? 'bg-primary border-primary text-primary-foreground shadow-md'
                      : 'bg-primary/20 border-primary text-primary'
                    : 'bg-background border-muted-foreground/30 text-muted-foreground/40'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-xs font-medium text-center leading-tight ${done ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                {labels[step.key]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
