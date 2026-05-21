import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { apiClient } from '../api/axios'
import MainLayout, { useRefreshNotificationCount } from './MainLayout'

const navigateMock = jest.fn()
const clearSessionMock = jest.fn()
const useAuthMock = jest.fn(() => ({
  authClaims: { sub: 'user-1', email: 'investigador@gsya.es', role: 'ADMIN' },
  clearSession: clearSessionMock,
}))

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

jest.mock('../context/auth-context', () => ({ useAuth: () => useAuthMock() }))

jest.mock('../services/notifications.service', () => ({
  getPendingCount: jest.fn().mockResolvedValue(5),
}))

jest.mock('../api/axios', () => ({
  apiClient: { post: jest.fn() },
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

function RefreshTrigger() {
  const refresh = useRefreshNotificationCount()
  return <button type="button" onClick={refresh}>RefreshNotif</button>
}

describe('MainLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthMock.mockReturnValue({
      authClaims: { sub: 'user-1', email: 'investigador@gsya.es', role: 'ADMIN' },
      clearSession: clearSessionMock,
    })
  })

  it('renders the shell header and dashboard link', () => {
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>,
    )
    expect(screen.getByRole('img', { name: /AURORA/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ADMIN/i })).toBeInTheDocument()
  })

  it('opens the profile menu, logs out and navigates to login', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: {} })
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /ADMIN/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /Cerrar sesión/i }))
    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/logout', undefined, {
        skipAuthRefresh: true,
      })
      expect(clearSessionMock).toHaveBeenCalled()
      expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  it('calls refreshNotificationCount via context', async () => {
    render(
      <MemoryRouter>
        <MainLayout />
        <RefreshTrigger />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /refreshnotif/i }))
    await waitFor(() => {
      expect(require('../services/notifications.service').getPendingCount).toHaveBeenCalled()
    })
  })

  it('handles null authClaims in refreshNotificationCount', async () => {
    useAuthMock.mockReturnValue({
      authClaims: null,
      clearSession: clearSessionMock,
    })
    render(
      <MemoryRouter>
        <MainLayout />
        <RefreshTrigger />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /refreshnotif/i }))
    await waitFor(() => {
      expect(navigateMock).not.toHaveBeenCalled()
    })
  })
})
