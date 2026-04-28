'use client'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <p className="text-muted-foreground text-sm">Sign in to your ShopTaj account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => login.mutate(d))} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
              </div>
              <Input type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign In'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">Sign up</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
