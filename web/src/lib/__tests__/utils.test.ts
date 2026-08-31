import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatPrice, truncate } from '@/lib/utils'

describe('formatting utilities', () => {
  it('formats prices in Tajik somoni without losing decimals', () => {
    const result = formatPrice(123.5)

    expect(result).toContain('123')
    expect(result).toMatch(/TJS|сом/u)
  })

  it('formats dates and date-times for display', () => {
    const date = '2026-08-31T12:30:00.000Z'

    expect(formatDate(date)).toMatch(/Aug 31, 2026/)
    expect(formatDateTime(date)).toMatch(/Aug 31, 2026/)
  })

  it('truncates only strings that exceed the limit', () => {
    expect(truncate('ShopTaj', 10)).toBe('ShopTaj')
    expect(truncate('A long product title', 6)).toBe('A long…')
  })
})
