'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

export function useAuth() {
  const { setAuth, clearAuth, user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  const login = useMutation({
    mutationFn: ({ next: _next, ...body }: { email: string; password: string; next?: string }) =>
      api.post('/auth/login', body),
    onSuccess: ({ data }, variables) => {
      setAuth(data.user, data.accessToken)
      toast.success(`Welcome back, ${data.user.fullName}!`)
      const next = (variables as any).next || '/'
      router.push(data.user.role === 'ADMIN' && next === '/' ? '/admin' : next)
    },
    onError: (err: any) => {
      const msg: string = err?.response?.data?.message || ''
      if (msg.startsWith('EMAIL_NOT_VERIFIED:')) {
        const parts = msg.split(':')
        const email = parts[1] || ''
        toast.info('Please verify your email first — a new code has been sent.')
        router.push(`/verify-email-notice?email=${encodeURIComponent(email)}`)
      } else {
        toast.error('Invalid email or password')
      }
    },
  })

  const register = useMutation({
    mutationFn: (body: { fullName: string; email: string; password: string; phone: string }) =>
      api.post('/auth/register', body),
    onSuccess: (_data, variables) => {
      toast.success('Account created! Enter the 6-digit code sent to your email.')
      router.push(`/verify-email-notice?email=${encodeURIComponent(variables.email)}`)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Registration failed')
    },
  })

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      clearAuth()
      qc.clear()
      router.push('/')
    },
  })

  return { user, login, register, logout }
}
