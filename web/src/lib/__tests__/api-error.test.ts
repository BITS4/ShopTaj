import { describe, expect, it } from 'vitest'
import { getApiErrorMessage, getApiErrorStatus } from '@/lib/api-error'

function axiosError(message: string | string[], status = 400): unknown {
  return {
    isAxiosError: true,
    response: { data: { message }, status },
  }
}

describe('API error helpers', () => {
  it('reads a single API message and status', () => {
    const error = axiosError('Invalid address', 422)

    expect(getApiErrorMessage(error, 'Fallback')).toBe('Invalid address')
    expect(getApiErrorStatus(error)).toBe(422)
  })

  it('joins validation messages into one user-safe message', () => {
    expect(
      getApiErrorMessage(axiosError(['Email is required', 'Phone is invalid']), 'Fallback'),
    ).toBe('Email is required, Phone is invalid')
  })

  it('uses the fallback for non-Axios failures', () => {
    expect(getApiErrorMessage(new Error('internal detail'), 'Please try again')).toBe(
      'Please try again',
    )
    expect(getApiErrorStatus(new Error('internal detail'))).toBeUndefined()
  })
})
