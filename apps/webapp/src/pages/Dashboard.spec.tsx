import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'

describe('Dashboard', () => {
  it('renders the dashboard metrics and content', () => {
    render(<Dashboard />)

    expect(screen.getByRole('heading', { name: /Panel principal de AURORA/i })).toBeInTheDocument()
    expect(screen.getByText(/HttpOnly cookies/i)).toBeInTheDocument()
    expect(screen.getByText(/Traefik \/api/i)).toBeInTheDocument()
  })
})