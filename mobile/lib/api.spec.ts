import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const requestUse = vi.fn()
  const responseUse = vi.fn()
  const client = Object.assign(vi.fn(), {
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
  })

  return {
    axiosCreate: vi.fn((_options: { baseURL: string }) => client),
    axiosPost: vi.fn(),
    client,
    deleteItemAsync: vi.fn(),
    getItemAsync: vi.fn(),
    requestUse,
    responseUse,
    setItemAsync: vi.fn(),
  }
})

vi.mock('axios', () => ({
  default: {
    create: mocks.axiosCreate,
    post: mocks.axiosPost,
  },
}))

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
      hostUri: '10.0.0.12:8081',
    },
  },
}))

vi.mock('expo-secure-store', () => ({
  deleteItemAsync: mocks.deleteItemAsync,
  getItemAsync: mocks.getItemAsync,
  setItemAsync: mocks.setItemAsync,
}))

import { fixImageUrl } from './api'

interface RequestConfig {
  _retry?: boolean
  headers: Record<string, string>
}

interface ResponseError {
  config: RequestConfig
  response?: { status: number }
}

type RequestHandler = (config: RequestConfig) => Promise<RequestConfig>
type ResponseHandler = <T>(response: T) => T
type ResponseErrorHandler = (error: ResponseError) => Promise<unknown>

const requestHandler = mocks.requestUse.mock.calls[0][0] as RequestHandler
const responseHandler = mocks.responseUse.mock.calls[0][0] as ResponseHandler
const responseErrorHandler = mocks.responseUse.mock.calls[0][1] as ResponseErrorHandler
const baseUrl = (mocks.axiosCreate.mock.calls[0][0] as { baseURL: string }).baseURL

describe('mobile API client', () => {
  beforeEach(() => {
    mocks.axiosPost.mockReset()
    mocks.client.mockReset()
    mocks.deleteItemAsync.mockReset()
    mocks.getItemAsync.mockReset()
    mocks.setItemAsync.mockReset()
  })

  it('uses the Metro host for API and local image URLs by default', () => {
    const developmentHost = process.env.EXPO_PUBLIC_DEV_HOST ?? '10.0.0.12'

    expect(baseUrl).toBe(process.env.EXPO_PUBLIC_API_URL ?? `http://${developmentHost}:3001/api`)
    expect(fixImageUrl('http://localhost:3000/items/photo.jpg')).toBe(
      `http://${developmentHost}:3000/items/photo.jpg`,
    )
  })

  it('attaches the stored access token to requests', async () => {
    mocks.getItemAsync.mockResolvedValue('access-token')
    const config: RequestConfig = { headers: {} }

    await expect(requestHandler(config)).resolves.toBe(config)
    expect(mocks.getItemAsync).toHaveBeenCalledWith('access_token')
    expect(config.headers.Authorization).toBe('Bearer access-token')
  })

  it('continues without credentials when secure storage is unavailable', async () => {
    mocks.getItemAsync.mockRejectedValue(new Error('SecureStore unavailable'))
    const config: RequestConfig = { headers: {} }

    await expect(requestHandler(config)).resolves.toBe(config)
    expect(config.headers).toEqual({})
  })

  it('returns successful responses unchanged', () => {
    const response = { data: { id: 'product-1' }, status: 200 }

    expect(responseHandler(response)).toBe(response)
  })

  it('refreshes once after an unauthorized response and retries the request', async () => {
    mocks.axiosPost.mockResolvedValue({
      data: { accessToken: 'refreshed-token' },
    })
    mocks.setItemAsync.mockResolvedValue(undefined)
    mocks.client.mockResolvedValue({ data: { ok: true } })
    const config: RequestConfig = { headers: {} }

    await expect(responseErrorHandler({ config, response: { status: 401 } })).resolves.toEqual({
      data: { ok: true },
    })

    expect(config._retry).toBe(true)
    expect(mocks.axiosPost).toHaveBeenCalledWith(`${baseUrl}/auth/refresh`)
    expect(mocks.setItemAsync).toHaveBeenCalledWith('access_token', 'refreshed-token')
    expect(config.headers.Authorization).toBe('Bearer refreshed-token')
    expect(mocks.client).toHaveBeenCalledWith(config)
  })

  it('clears stale credentials when refresh fails', async () => {
    const error: ResponseError = {
      config: { headers: {} },
      response: { status: 401 },
    }
    mocks.axiosPost.mockRejectedValue(new Error('Refresh rejected'))
    mocks.deleteItemAsync.mockResolvedValue(undefined)

    await expect(responseErrorHandler(error)).rejects.toBe(error)
    expect(mocks.deleteItemAsync).toHaveBeenCalledWith('access_token')
  })

  it('does not enter a refresh loop for a retried request', async () => {
    const error: ResponseError = {
      config: { _retry: true, headers: {} },
      response: { status: 401 },
    }

    await expect(responseErrorHandler(error)).rejects.toBe(error)
    expect(mocks.axiosPost).not.toHaveBeenCalled()
  })
})
