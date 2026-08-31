import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from './api-error'

describe('getApiErrorMessage', () => {
  it('returns a server validation message from an Axios error', () => {
    const error = {
      isAxiosError: true,
      response: { data: { message: ['Email is invalid', 'Password is short'] } },
    }

    expect(getApiErrorMessage(error, 'Request failed')).toBe('Email is invalid, Password is short')
  })

  it('does not expose arbitrary thrown values to the user', () => {
    expect(getApiErrorMessage(new Error('internal detail'), 'Request failed')).toBe(
      'Request failed',
    )
  })
})
