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
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = ({ confirmPassword, ...data }: FormData) => registerUser.mutate(data)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create account</CardTitle>
          <p className="text-muted-foreground text-sm">Join ShopTaj today</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name</label>
              <Input placeholder="John Doe" {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone (optional)</label>
              <Input placeholder="+1234567890" {...register('phone')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="Min 8 characters" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input type="password" placeholder="••••••••" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={registerUser.isPending}>
              {registerUser.isPending ? 'Creating account…' : 'Create Account'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
