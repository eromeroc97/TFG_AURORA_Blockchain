import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ErrorPage from './Error'

const navigateMock = jest.fn()
const useAuthMock = jest.fn()

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

describe('Error page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthMock.mockReturnValue({ isAuthenticated: false })
  })

  it('renders a generic and safe error message', () => {
    render(
      <MemoryRouter>
        <ErrorPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /No pudimos completar la acción/i })).toBeInTheDocument()
    expect(screen.getByText(/Por seguridad no mostramos detalles técnicos/i)).toBeInTheDocument()
  })

  it('navigates back when history is available', () => {
    Object.defineProperty(window.history, 'length', {
      configurable: true,
      value: 2,
    })

    render(
      <MemoryRouter>
        <ErrorPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Volver atrás/i }))

    expect(navigateMock).toHaveBeenCalledWith(-1)
  })

  it('uses dashboard as fallback when authenticated and no history exists', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true })
    Object.defineProperty(window.history, 'length', {
      configurable: true,
      value: 1,
    })

    render(
      <MemoryRouter>
        <ErrorPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Volver atrás/i }))

    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true })
  })

  it('uses login as fallback when unauthenticated and no history exists', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false })
    Object.defineProperty(window.history, 'length', {
      configurable: true,
      value: 1,
    })

    render(
      <MemoryRouter>
        <ErrorPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Volver atrás/i }))

    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true })
  })
})
