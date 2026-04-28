import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-7xl">🎉</div>
        <h1 className="text-3xl font-bold">Order Confirmed!</h1>
        <p className="text-muted-foreground">
          Thank you for your purchase. A confirmation email has been sent to you.
          We will notify you when your order ships.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/profile/orders"><Button>View My Orders</Button></Link>
          <Link href="/products"><Button variant="outline">Continue Shopping</Button></Link>
        </div>
      </div>
    </div>
  )
}
