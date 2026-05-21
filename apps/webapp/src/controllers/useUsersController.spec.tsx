import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getUsers, approveUser, revokeUser, changeUserRole } from '../services/users.service'
import { useUsersController } from './useUsersController'

jest.mock('../services/users.service', () => ({
  getUsers: jest.fn(),
  approveUser: jest.fn(),
  revokeUser: jest.fn(),
  changeUserRole: jest.fn(),
}))

const mockedGetUsers = getUsers as jest.MockedFunction<typeof getUsers>
const mockedApproveUser = approveUser as jest.MockedFunction<typeof approveUser>
const mockedRevokeUser = revokeUser as jest.MockedFunction<typeof revokeUser>
const mockedChangeUserRole = changeUserRole as jest.MockedFunction<typeof changeUserRole>

const mockUsers = [
  { id: 'user-1', email: 'a@a.com', name: 'User 1', role: 'USER' as const, status: 'PENDING' as const, createdAt: '2025-01-01' },
  { id: 'user-2', email: 'b@b.com', name: 'User 2', role: 'ADMIN' as const, status: 'ACTIVE' as const, createdAt: '2025-01-01' },
]

function TestComponent({ enabled = true }: { enabled?: boolean }) {
  const { users, isLoading, error, actionLoading, refreshUsers, approveUser: approve, revokeUser: revoke, changeUserRole: changeRole } = useUsersController(enabled)
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="actionLoading">{String(actionLoading)}</span>
      <span data-testid="error">{error ?? ''}</span>
      <span data-testid="count">{users.length}</span>
      <button type="button" onClick={refreshUsers}>Refresh</button>
      <button type="button" onClick={async () => { try { await approve('user-1') } catch {} }}>Approve</button>
      <button type="button" onClick={async () => { try { await revoke('user-1') } catch {} }}>Revoke</button>
      <button type="button" onClick={async () => { try { await changeRole('user-1', 'ADMIN') } catch {} }}>ChangeRole</button>
    </div>
  )
}

describe('useUsersController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads users on mount when enabled', async () => {
    mockedGetUsers.mockResolvedValueOnce(mockUsers)
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('count')).toHaveTextContent('2')
    expect(screen.getByTestId('error')).toHaveTextContent('')
  })

  it('does not fetch when disabled', async () => {
    render(<TestComponent enabled={false} />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(mockedGetUsers).not.toHaveBeenCalled()
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('handles 403 error silently', async () => {
    mockedGetUsers.mockRejectedValueOnce({ response: { status: 403 } })
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('error')).toHaveTextContent('')
    expect(screen.getByTestId('count')).toHaveTextContent('0')
  })

  it('handles generic error', async () => {
    mockedGetUsers.mockRejectedValueOnce(new Error('fail'))
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('error')).toHaveTextContent('No se ha podido cargar la lista de usuarios')
  })

  it('approveUser calls service and refreshes', async () => {
    mockedGetUsers
      .mockResolvedValueOnce(mockUsers)
      .mockResolvedValueOnce([mockUsers[0], { ...mockUsers[1], status: 'ACTIVE' }])
    mockedApproveUser.mockResolvedValueOnce(undefined)
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    await waitFor(() => expect(mockedApproveUser).toHaveBeenCalledWith('user-1'))
    expect(mockedGetUsers).toHaveBeenCalledTimes(2)
  })

  it('revokeUser calls service and refreshes', async () => {
    mockedGetUsers
      .mockResolvedValueOnce(mockUsers)
      .mockResolvedValueOnce([{ ...mockUsers[0], status: 'REVOKED' }, mockUsers[1]])
    mockedRevokeUser.mockResolvedValueOnce(undefined)
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }))
    await waitFor(() => expect(mockedRevokeUser).toHaveBeenCalledWith('user-1'))
  })

  it('changeUserRole calls service and refreshes', async () => {
    mockedGetUsers
      .mockResolvedValueOnce(mockUsers)
      .mockResolvedValueOnce([{ ...mockUsers[0], role: 'ADMIN' }, mockUsers[1]])
    mockedChangeUserRole.mockResolvedValueOnce(undefined)
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /changerole/i }))
    await waitFor(() => expect(mockedChangeUserRole).toHaveBeenCalledWith('user-1', 'ADMIN'))
  })

  it('handles approveUser error re-throw', async () => {
    mockedGetUsers.mockResolvedValueOnce(mockUsers)
    mockedApproveUser.mockRejectedValueOnce(new Error('approve fail'))
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    await waitFor(() => expect(screen.getByTestId('actionLoading')).toHaveTextContent('false'))
    expect(mockedApproveUser).toHaveBeenCalledWith('user-1')
  })

  it('handles revokeUser error re-throw', async () => {
    mockedGetUsers.mockResolvedValueOnce(mockUsers)
    mockedRevokeUser.mockRejectedValueOnce(new Error('revoke fail'))
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /revoke/i }))
    await waitFor(() => expect(screen.getByTestId('actionLoading')).toHaveTextContent('false'))
    expect(mockedRevokeUser).toHaveBeenCalledWith('user-1')
  })

  it('handles changeUserRole error re-throw', async () => {
    mockedGetUsers.mockResolvedValueOnce(mockUsers)
    mockedChangeUserRole.mockRejectedValueOnce(new Error('change fail'))
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /changerole/i }))
    await waitFor(() => expect(screen.getByTestId('actionLoading')).toHaveTextContent('false'))
    expect(mockedChangeUserRole).toHaveBeenCalledWith('user-1', 'ADMIN')
  })
})
