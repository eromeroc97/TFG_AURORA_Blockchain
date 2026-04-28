import { render, screen } from '@testing-library/react'

const mockedUseTelemetryController = jest.fn()
const mockedUseAuth = jest.fn()

jest.mock('../controllers/useTelemetryController', () => ({
  useTelemetryController: mockedUseTelemetryController,
}))

jest.mock('../context/auth-context', () => ({
  useAuth: mockedUseAuth,
}))

describe('TelemetryDashboard page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseAuth.mockReturnValue({ authClaims: { role: 'USER' } })
  })

  it('renders the telemetría page and refresh button', () => {
    mockedUseTelemetryController.mockReturnValue({
      data: {
        dailyVolume: [],
        successRatio: [],
        ecosystemUsage: [],
        totalDevices: 0,
      },
      isLoading: false,
      error: null,
      refreshMetrics: jest.fn(),
    })

    const TelemetryDashboard = require('./TelemetryDashboard').default

    render(<TelemetryDashboard />)

    expect(screen.getByText('Telemetría')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Actualizar/i })).toBeInTheDocument()
  })

  it('renders an error message when metrics fail to load', () => {
    mockedUseTelemetryController.mockReturnValue({
      data: {
        dailyVolume: [],
        successRatio: [],
        ecosystemUsage: [],
        totalDevices: 0,
      },
      isLoading: false,
      error: 'No se pudieron cargar las métricas. Intenta de nuevo más tarde.',
      refreshMetrics: jest.fn(),
    })

    const TelemetryDashboard = require('./TelemetryDashboard').default

    try {
      render(<TelemetryDashboard />)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('TelemetryDashboard render error', error)
      throw error
    }

    expect(screen.getByText(/Error al cargar métricas/i)).toBeInTheDocument()
    expect(screen.getByText(/No se pudieron cargar las métricas/i)).toBeInTheDocument()
  })

  it('renders the loading state when metrics are still loading', () => {
    mockedUseTelemetryController.mockReturnValue({
      data: {
        dailyVolume: [],
        successRatio: [],
        ecosystemUsage: [],
        totalDevices: 0,
      },
      isLoading: true,
      error: null,
      refreshMetrics: jest.fn(),
    })

    const TelemetryDashboard = require('./TelemetryDashboard').default
    const { container } = render(<TelemetryDashboard />)

    expect(screen.getByRole('button', { name: /Actualizar/i })).toBeInTheDocument()
    expect(screen.queryByText(/Sin métricas disponibles/i)).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
