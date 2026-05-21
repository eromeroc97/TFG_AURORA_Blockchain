import axios from 'axios'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { apiClient } from '../api/axios'
import Register from './Register'

jest.mock('../api/axios', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

const useAuthMock = jest.fn(() => ({ setSession: jest.fn() }))

jest.mock('../context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('Register page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthMock.mockReturnValue({ setSession: jest.fn() })
  })

  it('renders the registration heading', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /Registro de cuenta/i })).toBeInTheDocument()
  })

  it('submits the registration request and shows success feedback', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: {} })

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'new@aurora.local' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Solicitar registro/i }))

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith('/users', { email: 'new@aurora.local' })
    })

    expect(await screen.findByText(/Solicitud enviada/i)).toBeInTheDocument()
  })

  it('shows a conflict error for duplicated emails', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)
    mockedApiClient.post.mockRejectedValueOnce({ response: { status: 409 } })

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'duplicate@aurora.local' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Solicitar registro/i }))

    expect(await screen.findByText(/Ya existe un usuario con ese email/i)).toBeInTheDocument()

    ;(axios.isAxiosError as jest.Mock).mockRestore()
  })

  it('shows generic error on non-conflict failure', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)
    mockedApiClient.post.mockRejectedValueOnce({ response: { status: 500 } })

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'fail@aurora.local' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Solicitar registro/i }))

    expect(await screen.findByText(/No se pudo procesar el registro ahora mismo/i)).toBeInTheDocument()

    ;(axios.isAxiosError as jest.Mock).mockRestore()
  })
})