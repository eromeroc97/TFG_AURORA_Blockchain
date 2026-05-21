import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RequireAuditor from './RequireAuditor'
import * as authContext from '../../context/auth-context'

jest.mock('../../context/auth-context', () => ({
  useAuth: jest.fn(),
}))

const mockUseAuth = authContext.useAuth as jest.Mock

describe('RequireAuditor', () => {
  it('renders children when role is AUDITOR', () => {
    mockUseAuth.mockReturnValue({ authClaims: { role: 'AUDITOR' } })
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuditor />}>
            <Route path="/" element={<div>auditor content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toBe('auditor content')
  })

  it('renders children when role is ADMIN', () => {
    mockUseAuth.mockReturnValue({ authClaims: { role: 'ADMIN' } })
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuditor />}>
            <Route path="/" element={<div>auditor content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toBe('auditor content')
  })

  it('renders children when role is GLOBAL_ADMIN', () => {
    mockUseAuth.mockReturnValue({ authClaims: { role: 'GLOBAL_ADMIN' } })
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuditor />}>
            <Route path="/" element={<div>auditor content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toBe('auditor content')
  })

  it('redirects to /dashboard when role is USER', () => {
    mockUseAuth.mockReturnValue({ authClaims: { role: 'USER' } })
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuditor />}>
            <Route path="/" element={<div>auditor content</div>} />
          </Route>
          <Route path="/dashboard" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toBe('dashboard')
  })

  it('redirects to /dashboard when authClaims is null', () => {
    mockUseAuth.mockReturnValue({ authClaims: null })
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuditor />}>
            <Route path="/" element={<div>auditor content</div>} />
          </Route>
          <Route path="/dashboard" element={<div>dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(container.textContent).toBe('dashboard')
  })
})
