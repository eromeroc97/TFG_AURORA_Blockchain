import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'

jest.mock('../components/dashboard/AccessMap', () => () => (
  <div data-testid="access-map">Access Map Mock</div>
))

describe('Dashboard', () => {
  it('renders the dashboard metrics and content', () => {
    render(<Dashboard />)

    expect(screen.getByRole('heading', { name: /Panel principal de AURORA/i })).toBeInTheDocument()
    expect(screen.getByText(/HttpOnly cookies/i)).toBeInTheDocument()
    expect(screen.getByText(/Traefik \/api/i)).toBeInTheDocument()
    expect(screen.getByTestId('access-map')).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de AURORA/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de GSYA/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de UCLM/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipos MostrarUE/i)).toBeInTheDocument()
  })
})