import { CheckCircle, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type ShippingMethod = 'standard' | 'express'

interface ShippingMethodCopy {
  title: string
  standard: string
  standardDays: string
  express: string
  expressDays: string
}

interface ShippingMethodCardProps {
  value: ShippingMethod
  onChange: (method: ShippingMethod) => void
  locked: boolean
  copy: ShippingMethodCopy
}

export function ShippingMethodCard({ value, onChange, locked, copy }: ShippingMethodCardProps) {
  const methods: Array<{
    id: ShippingMethod
    label: string
    price: string
    days: string
  }> = [
    { id: 'standard', label: copy.standard, price: '$5.00', days: copy.standardDays },
    { id: 'express', label: copy.express, price: '$15.00', days: copy.expressDays },
  ]

  return (
    <Card className={locked ? 'opacity-75' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
          {copy.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {methods.map((method) => {
          const selected = value === method.id
          const stateClass = locked
            ? selected
              ? 'border-primary bg-primary/5'
              : 'hidden'
            : selected
              ? 'border-primary bg-primary/5 cursor-pointer'
              : 'hover:border-muted-foreground cursor-pointer'

          return (
            <label
              key={method.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition ${stateClass}`}
            >
              <input
                type="radio"
                name="shipping"
                value={method.id}
                checked={selected}
                onChange={() => !locked && onChange(method.id)}
                disabled={locked}
              />
              <div className="flex-1 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  {method.label}
                  {selected && locked && <CheckCircle className="h-4 w-4 text-primary" />}
                </p>
                <p className="text-muted-foreground">{method.days}</p>
              </div>
              <span className="font-semibold">{method.price}</span>
            </label>
          )
        })}
      </CardContent>
    </Card>
  )
}
