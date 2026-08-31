import axios from 'axios'

interface ApiErrorBody {
  message?: string | string[]
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return fallback

  const message = error.response?.data?.message
  if (Array.isArray(message)) return message.join(', ')

  return message || fallback
}
