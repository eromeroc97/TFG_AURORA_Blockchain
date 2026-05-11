import axios from 'axios'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { apiClient } from '../api/axios'
import Recover from './Recover'

jest.mock('../api/axios', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    setSession: jest.fn(),
  }),
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('Recover page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderRecover = (state?: Record<string, unknown>) =>
    render(
      <MemoryRouter initialEntries={[{ pathname: '/recover', state }]}>
        <Routes>
          <Route path="/recover" element={<Recover />} />
        </Routes>
      </MemoryRouter>,
    )

  it('prefills the email and shows the passblock message from navigation state', () => {
    renderRecover({
      prefillEmail: 'blocked@aurora.local',
      forcedRecoverMessage:
        'Tu contraseña lleva demasiado tiempo sin cambiarse. Debes iniciar el proceso de recuperación.',
    })

    expect(screen.getByDisplayValue('blocked@aurora.local')).toBeInTheDocument()
    expect(screen.getByText(/Tu contraseña lleva demasiado tiempo sin cambiarse/i)).toBeInTheDocument()
  })

  it('submits the recovery request and clears the email on success', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: {} })

    renderRecover()

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'recover@aurora.local' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Enviar enlace de recuperacion/i }))

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/auth/recover',
        { email: 'recover@aurora.local' },
        { skipAuthRefresh: true },
      )
    })

    expect(await screen.findByText(/recibirás instrucciones para recuperar tu acceso/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('tu@email.com')).toHaveValue('')
  })

  it('shows a connection error when the recovery request has no response', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)
    mockedApiClient.post.mockRejectedValueOnce({ response: undefined })

    renderRecover()

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'recover@aurora.local' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Enviar enlace de recuperacion/i }))

    expect(
      await screen.findByText(/No se pudo contactar con el servicio de recuperación/i),
    ).toBeInTheDocument()

    ;(axios.isAxiosError as jest.Mock).mockRestore()
  })
})