import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getMapEcosystems } from '../services/dashboard.service'
import { useDashboardController } from './useDashboardController'

jest.mock('../services/dashboard.service', () => ({
  getMapEcosystems: jest.fn(),
}))

const mockedGetMapEcosystems = getMapEcosystems as jest.MockedFunction<typeof getMapEcosystems>

function TestComponent() {
  const { ecosystems, isLoading, error, refreshEcosystems } = useDashboardController()
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{error ?? ''}</span>
      <span data-testid="count">{ecosystems.length}</span>
      <button type="button" onClick={refreshEcosystems}>Refresh</button>
    </div>
  )
}

describe('useDashboardController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads ecosystems on mount and shows data', async () => {
    mockedGetMapEcosystems.mockResolvedValueOnce([
      { id: 'eco-1', name: 'Eco 1', lat: 40, lng: -3, isShared: false, devices: [] },
    ])
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(screen.getByTestId('error')).toHaveTextContent('')
  })

  it('sets error on failure', async () => {
    mockedGetMapEcosystems.mockRejectedValueOnce(new Error('fail'))
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('count')).toHaveTextContent('0')
    expect(screen.getByTestId('error')).toHaveTextContent('No se han podido cargar los ecosistemas')
  })

  it('refreshEcosystems reloads data', async () => {
    mockedGetMapEcosystems
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'eco-2', name: 'Eco 2', lat: null, lng: null, isShared: false, devices: [] }])
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('count')).toHaveTextContent('0')
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'))
  })
})
