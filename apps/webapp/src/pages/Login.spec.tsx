import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import axios from 'axios'
import { apiClient } from '../api/axios'
import Login from './Login'

const navigateMock = jest.fn()
const setSessionMock = jest.fn()
const useAuthMock = jest.fn(() => ({ setSession: setSessionMock }))

jest.mock('../context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}))

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

jest.mock('../api/axios', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    isAxiosError: jest.fn(() => true),
  },
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('Login page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(axios.isAxiosError as jest.Mock).mockReturnValue(true)
  })

  it('renders the login header and brand text', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /Accede al panel de AURORA/i })).toBeInTheDocument()
    expect(screen.getByText(/Usa tus credenciales para acceder a la plataforma/i)).toBeInTheDocument()
  })

  it('submits credentials and navigates to dashboard on success', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { accessToken: 'access-token' } })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'user@aurora.local' },
    })
    fireEvent.change(screen.getByPlaceholderText('Tu contraseña'), {
      target: { value: 'Password123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }))

    await waitFor(() => {
      expect(setSessionMock).toHaveBeenCalledWith('access-token')
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('redirects passblocked users to recover with the backend message', async () => {
    mockedApiClient.post.mockRejectedValueOnce({
      response: {
        data: {
          message:
            'PASSBLOCK: Tu contraseña lleva demasiado tiempo sin cambiarse. Debes iniciar el proceso de recuperación.',
        },
      },
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'blocked@aurora.local' },
    })
    fireEvent.change(screen.getByPlaceholderText('Tu contraseña'), {
      target: { value: 'Password123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        '/recover',
        expect.objectContaining({
          replace: true,
          state: {
            prefillEmail: 'blocked@aurora.local',
            forcedRecoverMessage:
              'Tu contraseña lleva demasiado tiempo sin cambiarse. Debes iniciar el proceso de recuperación.',
          },
        }),
      )
    })
  })

  it('shows a generic error when the login request fails unexpectedly', async () => {
    mockedApiClient.post.mockRejectedValueOnce(new Error('network down'))

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'user@aurora.local' },
    })
    fireEvent.change(screen.getByPlaceholderText('Tu contraseña'), {
      target: { value: 'Password123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }))

    expect(await screen.findByText(/No se pudo iniciar sesión/i)).toBeInTheDocument()
  })

  it('redirects to dashboard when already authenticated', async () => {
    useAuthMock.mockReturnValue({
      setSession: setSessionMock,
      isAuthenticated: true,
      isHydrating: false,
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('redirects to audit when authenticated user is AUDITOR', async () => {
    useAuthMock.mockReturnValue({
      setSession: setSessionMock,
      isAuthenticated: true,
      isHydrating: false,
    })
    localStorage.setItem('aurora_token', 'header.' + btoa(JSON.stringify({ role: 'AUDITOR' })) + '.signature')

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/audit', { replace: true })
    })

    localStorage.removeItem('aurora_token')
  })

  it('navigates to dashboard on success with default role', async () => {
    useAuthMock.mockReturnValue({ setSession: setSessionMock })
    mockedApiClient.post.mockResolvedValueOnce({ data: { accessToken: 'test-token' } })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'user@aurora.local' },
    })
    fireEvent.change(screen.getByPlaceholderText('Tu contraseña'), {
      target: { value: 'Password123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })
})
