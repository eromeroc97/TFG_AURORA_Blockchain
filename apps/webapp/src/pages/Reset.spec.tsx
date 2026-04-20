import { createHash } from 'crypto'
import axios from 'axios'
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
    mockedApiClient.post.mockResolvedValue({ data: { valid: true } } as never)

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
          <Route path="/login" element={<p>Login Page</p>} />
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

  it('renders the policy checklist and headings', async () => {
    renderReset()

    expect(await screen.findByRole('heading', { name: /Define tu nueva contraseña/i })).toBeInTheDocument()
    expect(screen.getByText(/Política de seguridad de contraseña/i)).toBeInTheDocument()
  })

  it('redirects to login when token is missing', async () => {
    renderReset('/reset')

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
    expect(mockedApiClient.post).not.toHaveBeenCalled()
  })

  it('redirects to login when backend says token is invalid', async () => {
    mockedApiClient.post.mockResolvedValueOnce({ data: { valid: false } } as never)

    renderReset()

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
    expect(mockedApiClient.post).toHaveBeenCalledWith(
      '/auth/reset/validate',
      { token: validToken },
      { skipAuthRefresh: true },
    )
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
    await screen.findByRole('heading', { name: /Define tu nueva contraseña/i })
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
    await screen.findByRole('heading', { name: /Define tu nueva contraseña/i })
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
    mockedApiClient.post
      .mockResolvedValueOnce({ data: { valid: true } } as never)
      .mockResolvedValueOnce({ data: { success: true } } as never)

    renderReset()
    await screen.findByRole('heading', { name: /Define tu nueva contraseña/i })
    fillValidPassword(password)
    fireEvent.blur(screen.getByPlaceholderText('Nueva contraseña'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

    await waitFor(() => {
      expect(mockedApiClient.post).toHaveBeenNthCalledWith(
        2,
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

    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      1,
      '/auth/reset/validate',
      { token: validToken },
      { skipAuthRefresh: true },
    )

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
  })

  it('shows an inactive-account message when reset returns 403', async () => {
    const isAxiosErrorSpy = jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)
    const password = 'Password123!'
    const digestHex = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase()

    mockDigest.mockResolvedValueOnce(Uint8Array.from(Buffer.from(digestHex, 'hex')).buffer)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    })
    mockedApiClient.post
      .mockResolvedValueOnce({ data: { valid: true } } as never)
      .mockRejectedValueOnce({
        response: {
          status: 403,
        },
      } as never)

    renderReset()
    await screen.findByRole('heading', { name: /Define tu nueva contraseña/i })
    fillValidPassword(password)
    fireEvent.blur(screen.getByPlaceholderText('Nueva contraseña'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByRole('button', { name: /Guardar contraseña/i }))

    expect(
      await screen.findByText(/Tu cuenta no está activa para actualizar contraseña/i),
    ).toBeInTheDocument()

    isAxiosErrorSpy.mockRestore()
  })
})