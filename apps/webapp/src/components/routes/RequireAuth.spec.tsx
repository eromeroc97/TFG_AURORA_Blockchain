import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RequireAuth from './RequireAuth'

const useAuthMock = jest.fn()

jest.mock('../../context/auth-context', () => ({
  useAuth: () => useAuthMock(),
}))

describe('RequireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns nothing while hydrating', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isHydrating: true })

    const { container } = render(<RequireAuth />)

    expect(container).toBeEmptyDOMElement()
  })

  it('redirects anonymous users to login', async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isHydrating: false })

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/private" element={<div>Secret</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })

  it('renders protected content for authenticated users', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isHydrating: false })

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/private" element={<div>Secret</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Secret')).toBeInTheDocument()
  })
})