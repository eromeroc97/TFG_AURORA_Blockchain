import { render, screen } from '@testing-library/react'
import Dashboard from './Dashboard'

type MockAuthClaims = {
  sub: string
  role: string
  email: string
  did: string | null
}

let mockAuthClaims: MockAuthClaims = {
  sub: '123e4567-e89b-12d3-a456-426614174000',
  role: 'ADMIN',
  email: 'admin@aurora.es',
  did: null,
}

jest.mock('../components/dashboard/AccessMap', () => () => (
  <div data-testid="access-map">Access Map Mock</div>
))

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    authClaims: mockAuthClaims,
  }),
}))

describe('Dashboard', () => {
  beforeEach(() => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'ADMIN',
      email: 'admin@aurora.es',
      did: null,
    }
  })

  it('renders the admin dashboard by default', () => {
    render(<Dashboard />)

    expect(screen.getByRole('heading', { level: 1, name: /cybersecurity/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Gestión de usuarios/i })).toBeInTheDocument()
    expect(screen.getByText(/user1@aurora.local/i)).toBeInTheDocument()
    expect(screen.getByTestId('access-map')).toBeInTheDocument()
  })

  it('renders the user dashboard content', () => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
      did: null,
    }

    render(<Dashboard />)

    expect(screen.getByRole('heading', { level: 1, name: /cybersecurity/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Mis ecosistemas instanciados/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Compartidos conmigo/i })).toBeInTheDocument()
    expect(screen.getByText(/Hogar Inteligente - Toledo Norte/i)).toBeInTheDocument()
    expect(screen.getByText(/Vivienda Segura - Ciudad Real/i)).toBeInTheDocument()
    expect(screen.getByText(/Laboratorio Domótico - Campus UCLM/i)).toBeInTheDocument()
    expect(screen.queryByText(/Piloto Energético - Albacete/i)).not.toBeInTheDocument()
  })

  it('renders the auditor dashboard content', () => {
    mockAuthClaims = {
      sub: '71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4',
      role: 'AUDITOR',
      email: 'auditor@aurora.es',
      did: null,
    }

    render(<Dashboard />)

    expect(screen.getByRole('heading', { level: 2, name: /Todos los ecosistemas/i })).toBeInTheDocument()
    expect(screen.getByText(/Hogar Inteligente - Toledo Norte/i)).toBeInTheDocument()
    expect(screen.getByText(/Piloto Energético - Albacete/i)).toBeInTheDocument()
    expect(screen.getByText(/Vivienda Segura - Ciudad Real/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Ver detalles/i)).toHaveLength(4)
  })

  it('keeps the global admin experience aligned with admin', () => {
    mockAuthClaims = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      role: 'GLOBAL_ADMIN',
      email: 'global-admin@aurora.es',
      did: null,
    }

    render(<Dashboard />)

    expect(screen.getByRole('heading', { level: 2, name: /Gestión de usuarios/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^Ecosistemas instanciados$/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Revocar/i })).toHaveLength(5)
  })
})