import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { apiClient } from '../api/axios'
import MainLayout from './MainLayout'

const navigateMock = jest.fn()
const clearSessionMock = jest.fn()

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    authClaims: {
      email: 'investigador@gsya.es',
      role: 'ADMIN',
    },
    clearSession: clearSessionMock,
  }),
}))

jest.mock('../api/axios', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('MainLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the shell header and dashboard link', () => {
    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>,
    )

    expect(screen.getByText('AURORA')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Perfil/i })).toBeInTheDocument()
  })

  it('opens the profile menu, logs out and navigates to login', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: {} })

    render(
      <MemoryRouter>
        <MainLayout />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Perfil/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /Cerrar sesión/i }))

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/logout', undefined, {
        skipAuthRefresh: true,
      })
      expect(clearSessionMock).toHaveBeenCalled()
      expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
    })
  })
})