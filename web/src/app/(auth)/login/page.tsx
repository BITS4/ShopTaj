'use client'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useT } from '@/store/language.store'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const t = useT()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-3xl font-bold text-primary mb-1">ShopTaj</div>
          <CardTitle className="text-2xl">{t.auth.welcome_back}</CardTitle>
          <p className="text-muted-foreground text-sm">{t.auth.sign_in_sub}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => login.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t.auth.email}</label>
              <Input type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-sm font-medium">{t.auth.password}</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">{t.auth.forgot}</Link>
              </div>
              <Input type="password" placeholder="••••••••" {...register('password')} />
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? t.auth.signing_in : t.auth.sign_in}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t.auth.no_account}{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">{t.auth.sign_up_link}</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
