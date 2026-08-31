'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useT } from '@/store/language.store'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const t = useT()
  const { register, handleSubmit } = useForm<{ email: string }>()

  const onSubmit = async ({ email }: { email: string }) => {
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      toast.error(t.common.error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{t.auth.reset_password}</CardTitle>
          <p className="text-muted-foreground text-sm">{t.auth.reset_sub}</p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-center text-sm text-muted-foreground py-4">✅ {t.auth.reset_sent}</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                type="email"
                placeholder="you@example.com"
                {...register('email', { required: true })}
              />
              <Button type="submit" className="w-full">
                {t.auth.send_link}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
