import axios from 'axios'

type ApiErrorPayload = {
  message?: string | string[]
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) return fallback

  const message = error.response?.data?.message
  if (Array.isArray(message)) return message.join(', ')
  return message || fallback
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined
}
