import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getTelemetryMetrics } from '../services/telemetry.service'
import { useTelemetryController } from './useTelemetryController'

jest.mock('../services/telemetry.service', () => ({
  getTelemetryMetrics: jest.fn(),
}))

const mockedGetTelemetryMetrics = getTelemetryMetrics as jest.MockedFunction<typeof getTelemetryMetrics>

function TestComponent({ initialRange }: { initialRange?: any }) {
  const { data, isLoading, error, refreshMetrics, changeRange, range } = useTelemetryController(initialRange)

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{error ?? ''}</span>
      <span data-testid="totalDevices">{data.totalDevices}</span>
      <span data-testid="range">{range}</span>
      <button type="button" onClick={refreshMetrics}>
        Refresh
      </button>
      <button type="button" onClick={() => changeRange('24h')}>
        Change Range
      </button>
    </div>
  )
}

describe('useTelemetryController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initially loads metrics and updates state on success', async () => {
    mockedGetTelemetryMetrics.mockResolvedValueOnce({
      dailyVolume: [{ hour: '10:00', tx: 5 }],
      successRatio: [{ name: 'ANCHORED', value: 100 }],
      ecosystemUsage: [{ name: 'Ecosystem A', anchors: 3 }],
      totalDevices: 12,
    })

    render(<TestComponent />)

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('error')).toHaveTextContent('')
    expect(screen.getByTestId('totalDevices')).toHaveTextContent('12')
  })

  it('sets an error when metric load fails', async () => {
    mockedGetTelemetryMetrics.mockRejectedValueOnce(new Error('API failure'))

    render(<TestComponent />)

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('error')).toHaveTextContent('No se pudieron cargar las métricas. Intenta de nuevo más tarde.')
    expect(screen.getByTestId('totalDevices')).toHaveTextContent('0')
  })

  it('refreshes metrics when refreshMetrics is called', async () => {
    mockedGetTelemetryMetrics.mockResolvedValueOnce({
      dailyVolume: [{ hour: '11:00', tx: 7 }],
      successRatio: [{ name: 'FAILED', value: 1 }],
      ecosystemUsage: [{ name: 'Ecosystem B', anchors: 2 }],
      totalDevices: 6,
    })
    mockedGetTelemetryMetrics.mockResolvedValueOnce({
      dailyVolume: [{ hour: '12:00', tx: 8 }],
      successRatio: [{ name: 'ANCHORED', value: 2 }],
      ecosystemUsage: [{ name: 'Ecosystem C', anchors: 4 }],
      totalDevices: 9,
    })

    render(<TestComponent />)

    await waitFor(() => expect(screen.getByTestId('totalDevices')).toHaveTextContent('6'))

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => expect(screen.getByTestId('totalDevices')).toHaveTextContent('9'))
    expect(mockedGetTelemetryMetrics).toHaveBeenCalledTimes(2)
  })

  it('handles 403 error with NO_DATA message', async () => {
    mockedGetTelemetryMetrics.mockRejectedValueOnce({
      response: { status: 403 },
    })

    render(<TestComponent />)

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('error')).toHaveTextContent('NO_DATA')
  })

  it('changes range and reloads data', async () => {
    mockedGetTelemetryMetrics.mockResolvedValueOnce({
      dailyVolume: [],
      successRatio: [{ name: 'ANCHORED', value: 100 }],
      ecosystemUsage: [],
      totalDevices: 0,
    })
    mockedGetTelemetryMetrics.mockResolvedValueOnce({
      dailyVolume: [],
      successRatio: [{ name: 'PENDING_ANCHOR', value: 50 }],
      ecosystemUsage: [],
      totalDevices: 0,
    })

    render(<TestComponent />)

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    fireEvent.click(screen.getByRole('button', { name: /change range/i }))

    await waitFor(() => expect(screen.getByTestId('range')).toHaveTextContent('24h'))
    expect(mockedGetTelemetryMetrics).toHaveBeenCalledTimes(2)
  })

  it('handles unknown success ratio names', async () => {
    mockedGetTelemetryMetrics.mockResolvedValueOnce({
      dailyVolume: [],
      successRatio: [{ name: 'UNKNOWN_STATUS', value: 50 }],
      ecosystemUsage: [],
      totalDevices: 0,
    })

    render(<TestComponent />)

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
  })
})
