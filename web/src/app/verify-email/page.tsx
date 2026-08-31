'use client'
import { Suspense } from 'react'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

function VerifyEmailPage() {
  const token = useSearchParams().get('token') ?? ''
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    api
      .get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  if (status === 'loading')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying your email…</p>
        </div>
      </div>
    )

  if (status === 'success')
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Email Verified!</h1>
          <p className="text-muted-foreground">Your account is now active. You can log in.</p>
          <Button className="w-full" onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        <XCircle className="h-20 w-20 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Invalid Link</h1>
        <p className="text-muted-foreground">This verification link is invalid or has expired.</p>
        <Button className="w-full" onClick={() => router.push('/login')}>
          Back to Login
        </Button>
      </div>
    </div>
  )
}

export default function VerifyEmailPageWithSuspense() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPage />
    </Suspense>
  )
}
