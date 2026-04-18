import type { ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Header from './Header'

const onSignOutMock = jest.fn()

const renderHeader = (
  initialPath = '/dashboard',
  props: Partial<ComponentProps<typeof Header>> = {},
) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="*"
          element={
            <Header
              onSignOut={onSignOutMock}
              userEmail={props.userEmail}
              userRole={props.userRole}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  )

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders navigation and profile fallback data', () => {
    renderHeader('/dashboard#auditoria')

    expect(screen.getByAltText('AURORA')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Auditoría' })).toHaveAttribute('href', '/dashboard#auditoria')
    expect(screen.getByRole('button', { name: /Sesión activa/i })).toBeInTheDocument()
  })

  it('opens the profile menu and triggers sign out', async () => {
    renderHeader('/dashboard', {
      userEmail: 'auditor@aurora.local',
      userRole: 'GLOBAL_ADMIN',
    })

    fireEvent.click(screen.getByRole('button', { name: /GLOBAL ADMIN auditor/i }))

    expect(screen.getByRole('menu', { name: 'Perfil' })).toBeInTheDocument()
    expect(screen.getByText('Sesión actual')).toBeInTheDocument()
    expect(screen.getByText('auditor@aurora.local')).toBeInTheDocument()
    expect(screen.getByText('GLOBAL ADMIN')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesión/i }))

    expect(onSignOutMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu', { name: 'Perfil' })).not.toBeInTheDocument()
  })

  it('closes the menu on escape and outside click', () => {
    renderHeader('/account', {
      userEmail: 'user@aurora.local',
      userRole: 'ADMIN',
    })

    fireEvent.click(screen.getByRole('button', { name: /ADMIN user/i }))
    expect(screen.getByRole('menu', { name: 'Perfil' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu', { name: 'Perfil' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /ADMIN user/i }))
    expect(screen.getByRole('menu', { name: 'Perfil' })).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu', { name: 'Perfil' })).not.toBeInTheDocument()
  })
})
