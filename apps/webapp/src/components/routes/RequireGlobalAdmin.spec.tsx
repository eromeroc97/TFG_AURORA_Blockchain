import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import RequireGlobalAdmin from './RequireGlobalAdmin'

const useAuthMock = jest.fn()

jest.mock('../../context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}))

describe('RequireGlobalAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects non-global-admin users to /error', () => {
    useAuthMock.mockReturnValue({ authClaims: { role: 'USER' } })

    render(
      <MemoryRouter initialEntries={['/blockchain']}>
        <Routes>
          <Route element={<RequireGlobalAdmin />}>
            <Route path="/blockchain" element={<div>Blockchain</div>} />
          </Route>
          <Route path="/error" element={<div>Error page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Error page')).toBeInTheDocument()
  })

  it('redirects ADMIN users to /error', () => {
    useAuthMock.mockReturnValue({ authClaims: { role: 'ADMIN' } })

    render(
      <MemoryRouter initialEntries={['/blockchain']}>
        <Routes>
          <Route element={<RequireGlobalAdmin />}>
            <Route path="/blockchain" element={<div>Blockchain</div>} />
          </Route>
          <Route path="/error" element={<div>Error page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Error page')).toBeInTheDocument()
  })

  it('allows GLOBAL_ADMIN to access protected content', () => {
    useAuthMock.mockReturnValue({ authClaims: { role: 'GLOBAL_ADMIN' } })

    render(
      <MemoryRouter initialEntries={['/blockchain']}>
        <Routes>
          <Route element={<RequireGlobalAdmin />}>
            <Route path="/blockchain" element={<div>Blockchain</div>} />
          </Route>
          <Route path="/error" element={<div>Error page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Blockchain')).toBeInTheDocument()
  })

  it('handles missing authClaims (defaults to USER)', () => {
    useAuthMock.mockReturnValue({ authClaims: null })

    render(
      <MemoryRouter initialEntries={['/blockchain']}>
        <Routes>
          <Route element={<RequireGlobalAdmin />}>
            <Route path="/blockchain" element={<div>Blockchain</div>} />
          </Route>
          <Route path="/error" element={<div>Error page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Error page')).toBeInTheDocument()
  })
})