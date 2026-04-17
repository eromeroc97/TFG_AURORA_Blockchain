import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { apiClient } from '../api/axios'
import { useAuth } from './auth-context'
import { AuthProvider } from './AuthProvider'
import { clearAuthAccessToken } from './auth-session'

jest.mock('../api/axios', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

function Consumer() {
  const { isHydrating, isAuthenticated, setSession, clearSession } = useAuth()

  return (
    <div>
      <span>{isHydrating ? 'hydrating' : 'ready'}</span>
      <span>{isAuthenticated ? 'authenticated' : 'anonymous'}</span>
      <button type="button" onClick={() => setSession('next-token')}>
        set
      </button>
      <button type="button" onClick={clearSession}>
        clear
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearAuthAccessToken()
  })

  it('bootstraps the session and exposes authenticated state', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { accessToken: 'bootstrap-token' } })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    expect(screen.getByText('hydrating')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('ready')).toBeInTheDocument()
      expect(screen.getByText('authenticated')).toBeInTheDocument()
    })
  })

  it('falls back to anonymous when refresh fails and allows clearing the session', async () => {
    mockedApiClient.post.mockRejectedValueOnce(new Error('refresh failed'))

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('anonymous')).toBeInTheDocument()
      expect(screen.getByText('ready')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'set' }))
    expect(screen.getByText('authenticated')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'clear' }))
    expect(screen.getByText('anonymous')).toBeInTheDocument()
  })
})