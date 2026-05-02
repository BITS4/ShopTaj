import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

// In development: use your local IP so the phone can reach the dev server
// In production:  reads from app.json extra.apiUrl (set to your Railway backend)
const DEV_HOST = '192.168.1.9'
const BASE_URL: string =
  Constants.expoConfig?.extra?.apiUrl ??
  `http://${DEV_HOST}:3001/api`

// Images in dev are served by Next.js on port 3000.
// In production they'll come from Cloudinary or the Railway backend — no fix needed.
export function fixImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://localhost:3000')) {
    return url.replace('http://localhost:3000', `http://${DEV_HOST}:3000`)
  }
  return url
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
