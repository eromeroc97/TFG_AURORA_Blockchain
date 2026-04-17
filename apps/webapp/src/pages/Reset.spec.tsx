import { createHash } from 'crypto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { apiClient } from '../api/axios'
import Reset from './Reset'

jest.mock('../api/axios', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

const mockDigest = jest.fn()
const mockFetch = jest.fn()

describe('Reset page', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    Object.defineProperty(global, 'crypto', {
      configurable: true,
      value: {
        subtle: {
          digest: mockDigest,
        },
      },
    })

    global.fetch = mockFetch as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const validToken = 'abcdefghijklmnopqrstuvwxyzABCDE1234567890_-'

  const renderReset = (initialPath = `/reset?token=${validToken}`) =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/reset" element={<Reset />} />
          <Route path="/recover" element={<p>Recover Page</p>} />
        </Routes>
      </MemoryRouter>,
    )

  const fillValidPassword = (password: string) => {
    fireEvent.change(screen.getByPlaceholderText('Nueva contraseña'), {
      target: { value: password },
    })
    fireEvent.change(screen.getByPlaceholderText('Repite la nueva contraseña'), {
      target: { value: password },
    })
  }

  it('renders the policy checklist and headings', () => {
    renderReset()

    expect(screen.getByRole('heading', { name: /Define tu nueva contraseña/i })).toBeInTheDocument()
    expect(screen.getByText(/Política de seguridad de contraseña/i)).toBeInTheDocument()
  })

  it('redirects to recover when token is missing', async () => {
    renderReset('/reset')

    expect(await screen.findByText('Recover Page')).toBeInTheDocument()
  })

  it('shows the HIBP safe message for a valid password', async () => {
    const password = 'Password123!'
    const digestHex = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()

    mockDigest.mockResolvedValueOnce(Uint8Array.from(Buffer.from(digestHex, 'hex')).buffer)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    })

    renderReset()
    fillValidPassword(password)
    fireEvent.blur(screen.getByPlaceholderText('Nueva contraseña'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    expect(await screen.findByText(/No se encontraron coincidencias públicas/i)).toBeInTheDocument()
  })

  it('blocks submission when HIBP finds a compromised password', async () => {
    const password = 'Password123!'
    const digestHex = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()
    const hashPrefix = digestHex.slice(0, 5)
    const hashSuffix = digestHex.slice(5)

    mockDigest.mockResolvedValueOnce(Uint8Array.from(Buffer.from(digestHex, 'hex')).buffer)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `${hashSuffix}:42`,
    })

    renderReset()
    fillValidPassword(password)
    fireEvent.blur(screen.getByPlaceholderText('Nueva contraseña'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.pwnedpasswords.com/range/${hashPrefix}`,
      expect.objectContaining({ headers: { 'Add-Padding': 'true' } }),
    )
    expect(await screen.findByText(/Esta contraseña aparece en filtraciones públicas/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Guardar contraseña/i })).toBeDisabled()
  })

  it('submits a valid password when the HIBP check is safe', async () => {
    const password = 'Password123!'
    const digestHex = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()

    mockDigest.mockResolvedValueOnce(Uint8Array.from(Buffer.from(digestHex, 'hex')).buffer)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    })

    renderReset()
    fillValidPassword(password)
    fireEvent.blur(screen.getByPlaceholderText('Nueva contraseña'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/auth/reset',
        {
          token: validToken,
          password,
        },
        {
          skipAuthRefresh: true,
        },
      )
    })

    expect(await screen.findByText(/Contraseña actualizada correctamente/i)).toBeInTheDocument()
  })
})