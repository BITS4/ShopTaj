'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

interface ApiErrorBody {
  message?: string | string[]
}

interface LoginVariables {
  email: string
  password: string
  next?: string
}

function getApiErrorMessage(error: unknown): string {
  if (!isAxiosError<ApiErrorBody>(error)) return ''
  const message = error.response?.data?.message
  return Array.isArray(message) ? (message[0] ?? '') : (message ?? '')
}

export function useAuth() {
  const { setAuth, clearAuth, user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  const login = useMutation({
    mutationFn: ({ next: _next, ...body }: LoginVariables) => api.post('/auth/login', body),
    onSuccess: ({ data }, variables) => {
      setAuth(data.user, data.accessToken)
      toast.success(`Welcome back, ${data.user.fullName}!`)
      const next = variables.next || '/'
      router.push(data.user.role === 'ADMIN' && next === '/' ? '/admin' : next)
    },
    onError: (error: unknown) => {
      const msg = getApiErrorMessage(error)
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
    mutationFn: (body: {
      fullName: string
      email: string
      password: string
      phone: string
      accountType?: 'USER' | 'SELLER'
    }) => api.post('/auth/register', body),
    onSuccess: (_data, variables) => {
      toast.success('Account created! Enter the 6-digit code sent to your email.')
      router.push(`/verify-email-notice?email=${encodeURIComponent(variables.email)}`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error) || 'Registration failed')
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
