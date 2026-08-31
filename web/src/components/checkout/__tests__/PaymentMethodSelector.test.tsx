import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaymentMethodSelector } from '@/components/checkout/PaymentMethodSelector'

describe('PaymentMethodSelector', () => {
  it('shows the selected method and reports a new selection', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(<PaymentMethodSelector value="card" onChange={onChange} />)

    expect(screen.getByRole('radio', { name: /Credit \/ Debit Card/i })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /Alif Bank/i }))

    expect(onChange).toHaveBeenCalledWith('korti_milli')
  })
})
