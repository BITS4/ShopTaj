'use client'
export const dynamic = 'force-dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const token = useSearchParams().get('token') ?? ''
  const router = useRouter()
  const { register, handleSubmit, watch } = useForm<{ password: string; confirm: string }>()

  const onSubmit = async ({ password }: { password: string; confirm: string }) => {
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success('Password reset! Please log in.')
      router.push('/login')
    } catch {
      toast.error('Invalid or expired link')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>New Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input type="password" placeholder="New password (min 8 chars)" {...register('password', { required: true, minLength: 8 })} />
            <Input type="password" placeholder="Confirm password" {...register('confirm', { required: true })} />
            <Button type="submit" className="w-full">Reset Password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
