import { describe, expect, it } from 'vitest'
import { fixImageUrl } from './image-url'

describe('fixImageUrl', () => {
  it('maps local web images to the development machine', () => {
    expect(fixImageUrl('http://localhost:3000/uploads/item.jpg', '10.0.0.12')).toBe(
      'http://10.0.0.12:3000/uploads/item.jpg',
    )
  })

  it('keeps remote CDN images unchanged', () => {
    const url = 'https://cdn.example.com/products/item.jpg'

    expect(fixImageUrl(url, '10.0.0.12')).toBe(url)
  })

  it('normalizes empty image values to undefined', () => {
    expect(fixImageUrl(null, '10.0.0.12')).toBeUndefined()
    expect(fixImageUrl(undefined, '10.0.0.12')).toBeUndefined()
  })
})
