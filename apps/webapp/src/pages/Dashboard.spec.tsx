import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'

jest.mock('../components/dashboard/AccessMap', () => () => (
  <div data-testid="access-map">Access Map Mock</div>
))

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    authClaims: {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'ADMIN',
      email: 'admin@aurora.es',
      did: null,
    },
  }),
}))

describe('Dashboard', () => {
  it('renders the dashboard metrics and content', () => {
    render(<Dashboard />)

    expect(screen.getByRole('heading', { name: /Panel principal de AURORA/i })).toBeInTheDocument()
    expect(screen.getByText(/Ecosistemas instanciados/i)).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText(/Alertas de Seguridad/i)).toBeInTheDocument()
    expect(screen.getByText(/Threat Intelligence/i)).toBeInTheDocument()
    expect(screen.getByText(/OFFLINE/i)).toBeInTheDocument()
    expect(screen.getByTestId('access-map')).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de AURORA/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de GSYA/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de UCLM/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipos MostrarUE/i)).toBeInTheDocument()
  })
})