import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as ecosystemsService from '../services/ecosystems.service'
import { useEcosystemsController } from './useEcosystemsController'

jest.mock('../services/ecosystems.service', () => ({
  getEcosystems: jest.fn(),
  getMyEcosystems: jest.fn(),
  getSharedWithMe: jest.fn(),
  createEcosystem: jest.fn(),
  grantAccess: jest.fn(),
  revokeAccess: jest.fn(),
  updateAccessRole: jest.fn(),
  getEcosystemAccesses: jest.fn(),
}))

const mockedEcosystemsService = ecosystemsService as jest.Mocked<typeof ecosystemsService>

const mockEcosystem = { id: 'eco-1', name: 'Eco 1', ownerId: 'user-1', lat: 40, lng: -3, isShared: false, devices: [], accessType: 'OWNER' as const }
const mockSharedEcosystem = { id: 'eco-2', name: 'Shared', ownerId: 'user-2', lat: null, lng: null, isShared: true, devices: [], accessType: 'DELEGATED' as const }

function TestComponent() {
  const { ecosystems, sharedWithMe, isLoading, error, isCreating, refreshEcosystems, createEcosystem, addAccess, removeAccess, changeAccessRole, fetchAccesses, refreshMyEcosystems, refreshSharedWithMe } = useEcosystemsController()
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="creating">{String(isCreating)}</span>
      <span data-testid="error">{error ?? ''}</span>
      <span data-testid="ecoCount">{ecosystems.length}</span>
      <span data-testid="sharedCount">{sharedWithMe.length}</span>
      <button type="button" onClick={refreshEcosystems}>Refresh</button>
      <button type="button" onClick={async () => { try { await createEcosystem('New Eco') } catch {} }}>Create</button>
      <button type="button" onClick={async () => { await addAccess('eco-1', 'u@u.com', 'VIEWER') }}>AddAccess</button>
      <button type="button" onClick={async () => { await removeAccess('eco-1', 'user-1') }}>RemoveAccess</button>
      <button type="button" onClick={async () => { await changeAccessRole('eco-1', 'user-1', 'EDITOR') }}>ChangeRole</button>
      <button type="button" onClick={async () => { await fetchAccesses('eco-1') }}>FetchAccesses</button>
      <button type="button" onClick={async () => { await refreshMyEcosystems() }}>RefreshMy</button>
      <button type="button" onClick={async () => { await refreshSharedWithMe() }}>RefreshShared</button>
    </div>
  )
}

describe('useEcosystemsController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedEcosystemsService.getMyEcosystems.mockResolvedValue([])
    mockedEcosystemsService.getSharedWithMe.mockResolvedValue([])
  })

  it('loads ecosystems on mount', async () => {
    mockedEcosystemsService.getEcosystems.mockResolvedValueOnce([mockEcosystem])
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('ecoCount')).toHaveTextContent('1')
    expect(screen.getByTestId('error')).toHaveTextContent('')
    expect(mockedEcosystemsService.getEcosystems).toHaveBeenCalled()
  })

  it('sets error on ecosystems load failure', async () => {
    mockedEcosystemsService.getEcosystems.mockRejectedValueOnce(new Error('fail'))
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('error')).toHaveTextContent('No se han podido cargar los ecosistemas')
    expect(screen.getByTestId('ecoCount')).toHaveTextContent('0')
  })

  it('creates ecosystem and prepends to list', async () => {
    const created = { id: 'new-eco', name: 'New Eco', ownerId: 'user-1', apiKey: 'key', latitude: null, longitude: null }
    mockedEcosystemsService.getEcosystems.mockResolvedValueOnce([])
    mockedEcosystemsService.createEcosystem.mockResolvedValueOnce(created)
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => expect(screen.getByTestId('ecoCount')).toHaveTextContent('1'))
    expect(screen.getByTestId('creating')).toHaveTextContent('false')
  })

  it('handles addAccess', async () => {
    mockedEcosystemsService.getEcosystems.mockResolvedValueOnce([])
    mockedEcosystemsService.grantAccess.mockResolvedValueOnce(undefined)
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /addaccess/i }))
    await waitFor(() => expect(mockedEcosystemsService.grantAccess).toHaveBeenCalledWith('eco-1', 'u@u.com', 'VIEWER'))
  })

  it('handles removeAccess', async () => {
    mockedEcosystemsService.getEcosystems.mockResolvedValueOnce([])
    mockedEcosystemsService.revokeAccess.mockResolvedValueOnce(undefined)
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /removeaccess/i }))
    await waitFor(() => expect(mockedEcosystemsService.revokeAccess).toHaveBeenCalledWith('eco-1', 'user-1'))
  })

  it('handles changeAccessRole', async () => {
    mockedEcosystemsService.getEcosystems.mockResolvedValueOnce([])
    mockedEcosystemsService.updateAccessRole.mockResolvedValueOnce(undefined)
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /changerole/i }))
    await waitFor(() => expect(mockedEcosystemsService.updateAccessRole).toHaveBeenCalledWith('eco-1', 'user-1', 'EDITOR'))
  })

  it('handles fetchAccesses', async () => {
    mockedEcosystemsService.getEcosystems.mockResolvedValueOnce([])
    mockedEcosystemsService.getEcosystemAccesses.mockResolvedValueOnce([])
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /fetchaccesses/i }))
    await waitFor(() => expect(mockedEcosystemsService.getEcosystemAccesses).toHaveBeenCalledWith('eco-1'))
  })

  it('handles refreshMyEcosystems error', async () => {
    mockedEcosystemsService.getEcosystems.mockResolvedValueOnce([])
    mockedEcosystemsService.getMyEcosystems.mockRejectedValueOnce(new Error('fail'))
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /refreshmy/i }))
    await waitFor(() => expect(mockedEcosystemsService.getMyEcosystems).toHaveBeenCalled())
  })

  it('handles refreshSharedWithMe success', async () => {
    mockedEcosystemsService.getEcosystems.mockResolvedValueOnce([])
    mockedEcosystemsService.getSharedWithMe.mockResolvedValueOnce([{ id: 's-1', name: 'Shared', ownerId: 'u2', lat: null, lng: null, isShared: true, devices: [], accessType: 'DELEGATED' }])
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /refreshshared/i }))
    await waitFor(() => expect(screen.getByTestId('sharedCount')).toHaveTextContent('1'))
  })

  it('handles refreshSharedWithMe error', async () => {
    mockedEcosystemsService.getEcosystems.mockResolvedValueOnce([])
    mockedEcosystemsService.getSharedWithMe.mockRejectedValueOnce(new Error('fail'))
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /refreshshared/i }))
    await waitFor(() => expect(mockedEcosystemsService.getSharedWithMe).toHaveBeenCalled())
  })

  it('handles createEcosystem error re-throw', async () => {
    mockedEcosystemsService.getEcosystems.mockResolvedValueOnce([])
    mockedEcosystemsService.createEcosystem.mockRejectedValueOnce(new Error('create fail'))
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => expect(screen.getByTestId('creating')).toHaveTextContent('false'))
  })
})
