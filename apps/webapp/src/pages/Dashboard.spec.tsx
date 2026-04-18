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

    // Check main heading
    expect(screen.getByRole('heading', { level: 1, name: /cybersecurity/i })).toBeInTheDocument()
    
    // Check metrics (use first occurrence which is the metric card)
    const ecosystemMetrics = screen.getAllByText(/^Ecosistemas instanciados$/i)
    expect(ecosystemMetrics[0]).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText(/Alertas de Seguridad/i)).toBeInTheDocument()
    expect(screen.getByText(/Threat Intelligence/i)).toBeInTheDocument()
    expect(screen.getByText(/OFFLINE/i)).toBeInTheDocument()
    
    // Check map component
    expect(screen.getByTestId('access-map')).toBeInTheDocument()
    
    // Check logos
    expect(screen.getByAltText(/Logotipo de AURORA/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de GSYA/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de UCLM/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de la UE/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de Ministerio de Hacienda/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de FEDER/i)).toBeInTheDocument()
    expect(screen.getByAltText(/Logotipo de CLM/i)).toBeInTheDocument()
    
    // Check ADMIN dashboard content (mocked role is ADMIN)
    expect(screen.getByText(/Gestión de usuarios/i)).toBeInTheDocument()
    expect(screen.getByText(/user1@aurora.local/i)).toBeInTheDocument()
  })
})