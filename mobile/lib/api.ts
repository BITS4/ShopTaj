import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { fixImageUrl as replaceLocalImageHost } from './image-url'

// Expo exposes the Metro host on a physical device. Environment variables can
// override it for emulators, tunnels, and production builds.
const DEV_HOST =
  process.env.EXPO_PUBLIC_DEV_HOST ?? Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl
const BASE_URL: string = configuredApiUrl ?? `http://${DEV_HOST}:3001/api`

// Images in dev are served by Next.js on port 3000.
// In production they'll come from Cloudinary or the Railway backend — no fix needed.
export function fixImageUrl(url: string | null | undefined): string | undefined {
  return replaceLocalImageHost(url, DEV_HOST)
}

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {
    // SecureStore can be unavailable in previews; continue without credentials.
  }
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
