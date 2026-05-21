import { render, screen } from '@testing-library/react'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it('renders VERIFIED status', () => {
    render(<StatusBadge status="VERIFIED" />)
    expect(screen.getByText('Verificado')).toBeInTheDocument()
  })

  it('renders DISCREPANCY status', () => {
    render(<StatusBadge status="DISCREPANCY" />)
    expect(screen.getByText('Discrepancia')).toBeInTheDocument()
  })
})
