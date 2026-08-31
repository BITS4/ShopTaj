import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PaymentMethod } from '@/types'

interface PaymentMethodSelectorProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

const paymentMethods: Array<{
  id: PaymentMethod
  label: string
  description: string
  icon: string
}> = [
  {
    id: 'card',
    label: 'Credit / Debit Card',
    description: 'Visa, Mastercard — online card payment',
    icon: '💳',
  },
  {
    id: 'korti_milli',
    label: 'Корти Миллӣ — Alif Bank',
    description: 'Pay via Alif Mobi app or Alif Bank transfer',
    icon: '🟢',
  },
  {
    id: 'dc_bank',
    label: 'Корти Миллӣ — DC Bank (Dushanbe City)',
    description: 'Pay via DC Next app or DC Bank transfer — 1.2% commission',
    icon: '🔵',
  },
]

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {paymentMethods.map((method) => (
          <label
            key={method.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
              value === method.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
            }`}
          >
            <input
              type="radio"
              name="payMethod"
              value={method.id}
              checked={value === method.id}
              onChange={() => onChange(method.id)}
            />
            <span className="text-xl" aria-hidden="true">
              {method.icon}
            </span>
            <span className="flex-1 text-sm">
              <span className="block font-semibold">{method.label}</span>
              <span className="block text-xs text-muted-foreground">{method.description}</span>
            </span>
          </label>
        ))}
      </CardContent>
    </Card>
  )
}
