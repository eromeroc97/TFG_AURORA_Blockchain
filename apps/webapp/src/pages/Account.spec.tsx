import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AccountPage from './Account'

const navigateMock = jest.fn()
const useAuthMock = jest.fn()

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

jest.mock('../context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}))

describe('Account page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    useAuthMock.mockReturnValue({
      authClaims: {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'investigador@gsya.es',
        role: 'ADMIN',
        did: null,
      },
      isHydrating: false,
    })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  const renderAccount = (initialPath = '/account?uuid=123e4567-e89b-12d3-a456-426614174000') =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    )

  it('cleans uuid from the URL and keeps the account data in state', async () => {
    renderAccount()

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/account', { replace: true })
    })

    expect(screen.getByDisplayValue('investigador@gsya.es')).toBeInTheDocument()
    expect(screen.getByText('123e4567-e89b-12d3-a456-426614174000')).toBeInTheDocument()
    expect(screen.getByText(/Se ha detectado un identificador de cuenta en la URL/i)).toBeInTheDocument()
  })

  it('opens the modal when requesting a password change', () => {
    renderAccount('/account')

    fireEvent.click(screen.getByRole('button', { name: /Solicitar Cambio de Contraseña/i }))

    expect(
      screen.getByText(/Se enviará un enlace de recuperación a tu correo y tu sesión actual se cerrará/i),
    ).toBeInTheDocument()
  })

  it('simulates the password change flow and redirects to login', async () => {
    renderAccount('/account')

    fireEvent.click(screen.getByRole('button', { name: /Solicitar Cambio de Contraseña/i }))
    fireEvent.click(screen.getByRole('button', { name: /Confirmar y Cerrar Sesión/i }))

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
    })

    expect(await screen.findByText(/Se ha enviado el enlace de recuperación/i)).toBeInTheDocument()
  })
})
