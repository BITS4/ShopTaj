import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShippingMethodCard } from '@/components/checkout/ShippingMethodCard'

const copy = {
  title: 'Shipping method',
  standard: 'Standard',
  standardDays: '3–5 days',
  express: 'Express',
  expressDays: '1–2 days',
}

describe('ShippingMethodCard', () => {
  it('reports a shipping choice while the checkout is editable', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<ShippingMethodCard value="standard" onChange={onChange} locked={false} copy={copy} />)

    expect(screen.getByRole('radio', { name: /Standard/i })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /Express/i }))

    expect(onChange).toHaveBeenCalledWith('express')
  })

  it('locks the selected method after payment starts', () => {
    render(<ShippingMethodCard value="express" onChange={vi.fn()} locked copy={copy} />)

    expect(screen.getByRole('radio', { name: /Express/i })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Standard/i }).closest('label')).toHaveClass('hidden')
  })
})
