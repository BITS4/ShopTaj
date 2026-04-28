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

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await api.post('/auth/refresh')
        useAuthStore.getState().setAuth(data.user, data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        if (typeof window !== 'undefined') {
          const authPages = ['/login', '/register', '/forgot-password', '/reset-password']
          if (!authPages.includes(window.location.pathname)) {
            window.location.href = '/login'
          }
        }
      }
    }
    return Promise.reject(error)
  },
)

export default api
