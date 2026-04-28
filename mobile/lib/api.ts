import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001/api'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
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
