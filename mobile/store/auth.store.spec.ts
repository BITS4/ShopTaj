import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './auth.store'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth()
  })

  it('stores an authenticated user and access token together', () => {
    const user = {
      id: 'user-1',
      email: 'customer@example.com',
      fullName: 'Test Customer',
      role: 'USER',
    }

    useAuthStore.getState().setAuth(user, 'access-token')

    expect(useAuthStore.getState()).toMatchObject({ user, token: 'access-token' })
  })

  it('clears all authentication data on logout', () => {
    useAuthStore.getState().setAuth(
      {
        id: 'seller-1',
        email: 'seller@example.com',
        fullName: 'Test Seller',
        role: 'SELLER',
      },
      'access-token',
    )

    useAuthStore.getState().clearAuth()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().token).toBeNull()
  })
})
