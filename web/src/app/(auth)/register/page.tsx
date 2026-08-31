'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/store/language.store'
import { ShoppingBag, Store } from 'lucide-react'

const schema = z.object({
  fullName: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(7, 'Enter a valid phone number').regex(/^[+\d\s\-()]+$/, 'Invalid phone format'),
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const t = useT()
  const [accountType, setAccountType] = useState<'USER' | 'SELLER'>('USER')
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })
  const onSubmit = ({ confirmPassword: _confirmPassword, ...data }: FormData) =>
    registerUser.mutate({ ...data, accountType })

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-3xl font-bold text-primary mb-1">ShopTaj</div>
          <CardTitle className="text-2xl">{t.auth.create_account}</CardTitle>
          <p className="text-muted-foreground text-sm">{t.auth.join_sub}</p>
        </CardHeader>
        <CardContent>
          {/* Account type selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setAccountType('USER')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                accountType === 'USER'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <ShoppingBag className="h-6 w-6" />
              <span className="text-sm font-medium">Buyer</span>
              <span className="text-xs">Shop & order</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('SELLER')}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                accountType === 'SELLER'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <Store className="h-6 w-6" />
              <span className="text-sm font-medium">Seller</span>
              <span className="text-xs">List & sell</span>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t.auth.full_name}</label>
              <Input placeholder="John Doe" {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t.auth.email}</label>
              <Input type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t.auth.phone} <span className="text-destructive">*</span>
              </label>
              <Input placeholder="+992 XX XXX XXXX" {...register('phone')} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t.auth.password}</label>
              <Input type="password" placeholder="Min 8 characters" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t.auth.confirm_password}</label>
              <Input type="password" placeholder="••••••••" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={registerUser.isPending}>
              {registerUser.isPending ? t.auth.creating : t.auth.create_account}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t.auth.have_account}{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">{t.auth.sign_in_link}</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
