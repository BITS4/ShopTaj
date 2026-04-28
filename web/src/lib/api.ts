import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  withCredentials: true,
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        await api.post('/auth/refresh')
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
