'use client'
import { Suspense } from 'react'
export const dynamic = 'force-dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Shield, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import type { User } from '@/types'

interface ApiErrorBody {
  message?: string | string[]
}

interface VerifyCodeResponse {
  accessToken: string
  user: User
}

function getApiErrorMessage(error: unknown): string {
  if (!isAxiosError<ApiErrorBody>(error)) return 'Invalid code'
  const message = error.response?.data?.message
  return (Array.isArray(message) ? message[0] : message) || 'Invalid code'
}

function VerifyEmailNoticePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const emailFromQuery = searchParams.get('email') || ''

  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState(emailFromQuery)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleDigit = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[idx] = digit
    setCode(next)
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus()
    // Auto-submit when all 6 digits filled
    if (digit && idx === 5 && next.every((d) => d)) {
      submitCode(next.join(''))
    }
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      submitCode(pasted)
    }
  }

  const submitCode = async (fullCode: string) => {
    if (!email) {
      toast.error('Enter your email first')
      return
    }
    setVerifying(true)
    try {
      const { data } = await api.post<VerifyCodeResponse>('/auth/verify-code', {
        email,
        code: fullCode,
      })
      // Backend auto-logs in after verification
      if (data.accessToken) {
        setAuth(data.user, data.accessToken)
        toast.success(`Welcome, ${data.user.fullName}! Your email is verified.`)
        router.push(data.user.role === 'SELLER' ? '/seller/onboarding' : '/')
      } else {
        toast.success('Email verified! You can now log in.')
        router.push('/login')
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error))
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
    setVerifying(false)
  }

  const resend = async () => {
    if (!email) {
      toast.error('Enter your email')
      return
    }
    setResending(true)
    try {
      await api.post('/auth/resend-code', { email })
      toast.success('New code sent!')
      setCountdown(60)
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch {
      toast.error('Could not resend code')
    }
    setResending(false)
  }

  const codeValue = code.join('')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-10 pb-8 text-center space-y-6">
          {/* Icon */}
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Shield className="h-10 w-10 text-primary" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold">Verify your email</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Enter the 6-digit code we sent to
              <br />
              <span className="font-medium text-foreground">{email || 'your email'}</span>
            </p>
          </div>

          {/* Email input (if not pre-filled) */}
          {!emailFromQuery && (
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-background text-center"
            />
          )}

          {/* 6-digit code input */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigit(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={verifying}
                className={`w-11 h-14 text-center text-2xl font-bold border-2 rounded-xl bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                  digit ? 'border-primary bg-primary/5' : 'border-input'
                } ${verifying ? 'opacity-50' : ''}`}
              />
            ))}
          </div>

          {/* Verify button */}
          <Button
            className="w-full"
            size="lg"
            onClick={() => submitCode(codeValue)}
            disabled={codeValue.length < 6 || verifying || !email}
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verifying…
              </>
            ) : (
              'Verify Email'
            )}
          </Button>

          {/* Resend */}
          <div className="text-sm text-muted-foreground">
            Didn't receive the code?{' '}
            {countdown > 0 ? (
              <span className="text-muted-foreground">Resend in {countdown}s</span>
            ) : (
              <button
                onClick={resend}
                disabled={resending}
                className="text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                {resending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Resend code
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">Code expires in 10 minutes</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailNoticePageWithSuspense() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailNoticePage />
    </Suspense>
  )
}
