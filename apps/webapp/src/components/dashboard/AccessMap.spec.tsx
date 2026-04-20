import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import AccessMap from './AccessMap'
import type { AccessMapEcosystem } from './access-map.data'

let mockAuthClaims = {
  sub: '123e4567-e89b-12d3-a456-426614174000',
  role: 'USER',
  email: 'user@aurora.es',
}

jest.mock('../../context/auth-context', () => ({
  useAuth: () => ({
    authClaims: mockAuthClaims,
  }),
}))

jest.mock('leaflet', () => ({
  __esModule: true,
  default: {
    divIcon: (options: unknown) => options,
    latLngBounds: (points: Array<[number, number]>) => ({ points }),
  },
}))

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  Marker: ({ children, position }: { children: ReactNode; position: [number, number] }) => (
    <div data-testid={`marker-${position[0]}-${position[1]}`}>{children}</div>
  ),
  Popup: ({ children }: { children: ReactNode }) => <div data-testid="popup">{children}</div>,
  TileLayer: () => null,
}))

jest.mock('react-dom/server', () => ({
  renderToStaticMarkup: (node: ReactNode) => `<static>${String(node)}</static>`,
}))

const ecosystems: AccessMapEcosystem[] = [
  {
    id: 'eco-001',
    name: 'Hogar Inteligente - Toledo Norte',
    ownerId: '123e4567-e89b-12d3-a456-426614174000',
    lat: 39.876,
    lng: -4.025,
    isShared: false,
    devices: ['Sensores de movimiento', 'Cámara interior'],
  },
  {
    id: 'eco-002',
    name: 'Laboratorio Domótico - Campus UCLM',
    ownerId: '71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4',
    lat: 39.862,
    lng: -4.025,
    isShared: true,
    devices: ['Gateway IoT', 'Sensor de apertura'],
  },
]

describe('AccessMap', () => {
  beforeEach(() => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
    }
  })

  it('renders the map container when there are no visible ecosystems', () => {
    render(<AccessMap ecosystems={[]} />)

    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('shows owned and shared ecosystems for a user and hides shared devices', () => {
    render(<AccessMap ecosystems={ecosystems} />)

    expect(screen.getByText(/Hogar Inteligente - Toledo Norte/i)).toBeInTheDocument()
    expect(screen.getByText(/Laboratorio Domótico - Campus UCLM/i)).toBeInTheDocument()
    expect(screen.getByText(/Sensores de movimiento/i)).toBeInTheDocument()
    expect(screen.getByText(/Cámara interior/i)).toBeInTheDocument()
    expect(screen.getByText(/No tienes permisos para ver los dispositivos/i)).toBeInTheDocument()
    expect(screen.queryByText(/Gateway IoT/i)).not.toBeInTheDocument()
  })

  it('shows all devices for an auditor', () => {
    mockAuthClaims = {
      sub: 'auditor-1',
      role: 'AUDITOR',
      email: 'auditor@aurora.es',
    }

    render(<AccessMap ecosystems={ecosystems} />)

    expect(screen.getByText(/Gateway IoT/i)).toBeInTheDocument()
    expect(screen.getByText(/Sensor de apertura/i)).toBeInTheDocument()
    expect(screen.queryByText(/No tienes permisos para ver los dispositivos/i)).not.toBeInTheDocument()
  })

  it('shows restricted devices and the central node for a global admin', () => {
    mockAuthClaims = {
      sub: 'global-admin-1',
      role: 'GLOBAL_ADMIN',
      email: 'global-admin@aurora.es',
    }

    render(<AccessMap ecosystems={[ecosystems[0]]} />)

    expect(screen.getByText(/Acceso a dispositivos restringido/i)).toBeInTheDocument()
    expect(screen.getByText(/Cerebro Central/i)).toBeInTheDocument()
  })

  it('shows restricted devices for admin users', () => {
    mockAuthClaims = {
      sub: 'admin-1',
      role: 'ADMIN',
      email: 'admin@aurora.es',
    }

    render(<AccessMap ecosystems={[ecosystems[0]]} />)

    expect(screen.getByText(/Acceso a dispositivos restringido/i)).toBeInTheDocument()
  })
})
