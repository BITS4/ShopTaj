import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// Use your computer's IP address so the phone can reach the backend
const SERVER_HOST = '192.168.1.9'
const BASE_URL = `http://${SERVER_HOST}:3001/api`

// Images are served by Next.js (port 3000). Replace localhost so the phone can reach them.
export function fixImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return url.replace('http://localhost:3000', `http://${SERVER_HOST}:3000`)
             .replace('https://localhost:3000', `http://${SERVER_HOST}:3000`)
}

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`)
        await SecureStore.setItemAsync('access_token', data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        await SecureStore.deleteItemAsync('access_token')
      }
    }
    return Promise.reject(error)
  },
)

export default api
