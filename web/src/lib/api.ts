import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().accessToken
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth endpoints that should NEVER trigger a token refresh attempt
const NO_REFRESH_URLS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-code',
  '/auth/resend-code',
]

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const url: string = original?.url || ''

    // Skip refresh logic for auth endpoints and already-retried requests
    const isAuthEndpoint = NO_REFRESH_URLS.some((u) => url.includes(u))
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        const { data } = await api.post('/auth/refresh')
        useAuthStore.getState().setAuth(data.user, data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        useAuthStore.getState().clearAuth()
        if (typeof window !== 'undefined') {
          const authPages = [
            '/login',
            '/register',
            '/forgot-password',
            '/reset-password',
            '/verify-email-notice',
          ]
          if (!authPages.some((p) => window.location.pathname.startsWith(p))) {
            window.location.href = '/login'
          }
        }
      }
    }
    return Promise.reject(error)
  },
)

export default api
