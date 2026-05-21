import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MainDashboard from './MainDashboard'

const mockUseAuth = jest.fn(() => ({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'ADMIN' } }))
const mockUseDashboardController = jest.fn()
const mockUseTelemetryController = jest.fn()
const mockUseUsersController = jest.fn()
const mockUseServiceHealthController = jest.fn()
const mockChangeRange = jest.fn()

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('../context/auth-context', () => ({ useAuth: () => mockUseAuth() }))

jest.mock('../controllers/useDashboardController', () => ({ useDashboardController: () => mockUseDashboardController() }))

jest.mock('../controllers/useTelemetryController', () => ({ useTelemetryController: () => mockUseTelemetryController() }))

jest.mock('../controllers/useUsersController', () => ({ useUsersController: () => mockUseUsersController() }))

jest.mock('../controllers/useServiceHealthController', () => ({ useServiceHealthController: () => mockUseServiceHealthController() }))

jest.mock('../components/dashboard/AccessMap', () => ({
  __esModule: true,
  default: () => <div data-testid="access-map" />,
}))

const baseTelemetryData = {
  dailyVolume: [{ timestamp: new Date().toISOString(), tx: 1000 }],
  successRatio: [{ name: 'Anclajes OK', value: 95 }, { name: 'Fallidos', value: 5 }],
  ecosystemUsage: [{ name: 'Eco1', anchors: 500 }],
  rawDailyVolume: null,
}

describe('MainDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'ADMIN' } })
    mockUseDashboardController.mockReturnValue({
      ecosystems: [{ id: 'eco1', name: 'Eco1', ownerId: 'u1', lat: 40, lng: -3, isShared: false, devices: [{ id: 'd1', name: 'Device1' }] }],
      isLoading: false,
      error: null,
    })
    mockUseTelemetryController.mockReturnValue({
      data: baseTelemetryData,
      error: null,
      range: '24h',
      changeRange: mockChangeRange,
    })
    mockUseUsersController.mockReturnValue({ users: [{ id: 'u1', email: 'user@test.com', role: 'ADMIN' }] })
    mockUseServiceHealthController.mockReturnValue({
      services: [{ id: 's1', name: 'API', status: 'Online', lastCheck: new Date().toISOString() }],
    })
  })

  it('renders dashboard with data', () => {
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText('AURORA Smart Home')).toBeInTheDocument()
    expect(screen.getByText('1000 B')).toBeInTheDocument() // volume
    expect(screen.getByText('API')).toBeInTheDocument() // service
  })

  it('shows loading skeleton for map', () => {
    mockUseDashboardController.mockReturnValue({
      ecosystems: [],
      isLoading: true,
      error: null,
    })
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    expect(screen.queryByTestId('access-map')).not.toBeInTheDocument()
  })

  it('shows map error state', () => {
    mockUseDashboardController.mockReturnValue({
      ecosystems: [],
      isLoading: false,
      error: 'Failed to load',
    })
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText('Error al cargar los ecosistemas')).toBeInTheDocument()
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
  })

  it('shows telemetry error state', () => {
    mockUseTelemetryController.mockReturnValue({
      data: baseTelemetryData,
      error: 'API Error',
      range: '24h',
      changeRange: mockChangeRange,
    })
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText('Error de telemetría')).toBeInTheDocument()
  })

  it('shows NO_DATA message', () => {
    mockUseTelemetryController.mockReturnValue({
      data: baseTelemetryData,
      error: 'NO_DATA',
      range: '24h',
      changeRange: mockChangeRange,
    })
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Tus ecosistemas aún no han enviado ningún dato/i)).toBeInTheDocument()
  })

  it('calls changeRange when range button is clicked', () => {
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('1h'))
    expect(mockChangeRange).toHaveBeenCalledWith('1h')
  })

  it('hides user count for USER role', () => {
    mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'user@test.com', role: 'USER' } })
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Usuarios existentes')).not.toBeInTheDocument()
  })

  it('shows user count for non-USER role', () => {
    mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'operator@test.com', role: 'OPERATOR' } })
    mockUseUsersController.mockReturnValue({ users: [] })
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText('Usuarios existentes')).toBeInTheDocument()
  })

  it('formats bytes correctly (KB)', () => {
    mockUseTelemetryController.mockReturnValue({
      data: {
        ...baseTelemetryData,
        dailyVolume: [{ timestamp: new Date().toISOString(), tx: 2048 }],
      },
      error: null,
      range: '24h',
      changeRange: mockChangeRange,
    })
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText('2.0 KB')).toBeInTheDocument()
  })

  it('formats bytes correctly (MB)', () => {
    mockUseTelemetryController.mockReturnValue({
      data: {
        ...baseTelemetryData,
        dailyVolume: [{ timestamp: new Date().toISOString(), tx: 2 * 1024 * 1024 }],
      },
      error: null,
      range: '24h',
      changeRange: mockChangeRange,
    })
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText('2.0 MB')).toBeInTheDocument()
  })

  it('renders loading empty volume when no rawDailyVolume', () => {
    mockUseTelemetryController.mockReturnValue({
      data: {
        ...baseTelemetryData,
        dailyVolume: [{ timestamp: new Date().toISOString(), tx: 0 }],
      },
      error: null,
      range: '24h',
      changeRange: mockChangeRange,
    })
    render(
      <MemoryRouter>
        <MainDashboard />
      </MemoryRouter>,
    )
    expect(screen.getByText('0 B')).toBeInTheDocument()
  })
})
