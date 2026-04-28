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
    mutationFn: (body: { email: string; password: string }) => api.post('/auth/login', body),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken)
      toast.success(`Welcome back, ${data.user.fullName}!`)
      router.push('/')
    },
    onError: () => toast.error('Invalid email or password'),
  })

  const register = useMutation({
    mutationFn: (body: { fullName: string; email: string; password: string; phone?: string }) =>
      api.post('/auth/register', body),
    onSuccess: () => {
      toast.success('Account created! Please verify your email.')
      router.push('/login')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Registration failed'),
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
