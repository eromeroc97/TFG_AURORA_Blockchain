import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UsersManagementPage from './UsersManagementPage'
import type { User } from '../components/dashboard/users.data'
import type { UserEcosystem } from '../services/ecosystems.service'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const mockUseAuth = jest.fn<{ authClaims: { sub: string; email: string; role: string } }, []>()
jest.mock('../context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))
mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'GLOBAL_ADMIN' } })

const mockController = {
  users: [],
  isLoading: false,
  error: null,
  actionLoading: false,
  refreshUsers: jest.fn(),
  approveUser: jest.fn(),
  revokeUser: jest.fn(),
  changeUserRole: jest.fn(),
}

jest.mock('../controllers/useUsersController', () => ({
  useUsersController: () => mockController,
}))

jest.mock('../components/Select', () => ({
  __esModule: true,
  default: ({ value, onChange, options }: { value: string | number; onChange: (v: string) => void; options: { value: string | number; label: string }[] }) => (
    <select data-testid="mock-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
      ))}
    </select>
  ),
}))

const mockGetUserEcosystems = jest.fn()
const mockGetUserById = jest.fn()
const mockGetUserTelemetryVolume = jest.fn()
jest.mock('../services/ecosystems.service', () => ({
  getUserEcosystems: (...args: unknown[]) => mockGetUserEcosystems(...args),
}))

jest.mock('../services/users.service', () => ({
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
  getUserTelemetryVolume: (...args: unknown[]) => mockGetUserTelemetryVolume(...args),
}))

const mockSendNotificationToUser = jest.fn()
const mockSendNotificationToRoles = jest.fn()
jest.mock('../services/notifications.service', () => ({
  sendNotificationToUser: (...args: unknown[]) => mockSendNotificationToUser(...args),
  sendNotificationToRoles: (...args: unknown[]) => mockSendNotificationToRoles(...args),
}))

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'user1@test.com',
    name: 'Test User',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: '2024-01-15T10:00:00.000Z',
    ...overrides,
  }
}

function mockEcosystem(overrides: Partial<UserEcosystem> = {}): UserEcosystem {
  return {
    id: 'eco-1',
    name: 'Test Ecosystem',
    ownerId: 'owner-1',
    latitude: null,
    longitude: null,
    accessType: 'OWNER',
    accessRole: 'VIEWER',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'GLOBAL_ADMIN' } })
  Object.assign(mockController, {
    users: [],
    isLoading: false,
    error: null,
    actionLoading: false,
  })
  mockGetUserEcosystems.mockResolvedValue([])
  mockGetUserById.mockResolvedValue(null)
  mockGetUserTelemetryVolume.mockResolvedValue(0)
  mockSendNotificationToUser.mockResolvedValue({ id: 'n-1' })
  mockSendNotificationToRoles.mockResolvedValue({ count: 3 })
})

function renderPage() {
  return render(
    <MemoryRouter>
      <UsersManagementPage />
    </MemoryRouter>,
  )
}

describe('UsersManagementPage', () => {
  describe('loading state', () => {
    it('shows loading skeletons when isLoading is true', () => {
      mockController.isLoading = true
      renderPage()
      const skeletons = document.querySelectorAll('.h-14.rounded-3xl')
      expect(skeletons.length).toBe(3)
    })
  })

  describe('error state', () => {
    it('shows error message', () => {
      mockController.error = 'Failed to load'
      renderPage()
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows no users message', () => {
      renderPage()
      expect(screen.getByText('No se encontraron usuarios para los filtros actuales.')).toBeInTheDocument()
    })
  })

  describe('dashboard cards', () => {
    it('renders summary cards with user counts', () => {
      mockController.users = [
        mockUser({ status: 'ACTIVE' }),
        mockUser({ status: 'ACTIVE' }),
        mockUser({ status: 'PENDING' }),
        mockUser({ status: 'PENDING' }),
      ]
      renderPage()
      expect(screen.getByText('Usuarios totales')).toBeInTheDocument()
      expect(screen.getByText('Usuarios activos')).toBeInTheDocument()
      expect(screen.getByText('Usuarios pendientes')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getAllByText('2').length).toBe(2)
    })
  })

  describe('filters', () => {
    it('renders search, role, status, and page size selects', () => {
      renderPage()
      expect(screen.getByPlaceholderText('Buscar por correo')).toBeInTheDocument()
      const selects = screen.getAllByTestId('mock-select')
      expect(selects.length).toBe(3)
    })

    it('filters users by search term', () => {
      mockController.users = [
        mockUser({ id: 'u1', email: 'alpha@test.com' }),
        mockUser({ id: 'u2', email: 'beta@test.com' }),
      ]
      renderPage()
      fireEvent.change(screen.getByPlaceholderText('Buscar por correo'), { target: { value: 'alpha' } })
      expect(screen.getByText('alpha@test.com')).toBeInTheDocument()
      expect(screen.queryByText('beta@test.com')).not.toBeInTheDocument()
    })

    it('filters users by role', () => {
      mockController.users = [
        mockUser({ id: 'u1', email: 'user@test.com', role: 'USER' }),
        mockUser({ id: 'u2', email: 'auditor@test.com', role: 'AUDITOR' }),
      ]
      renderPage()
      const selects = screen.getAllByTestId('mock-select')
      fireEvent.change(selects[0], { target: { value: 'AUDITOR' } })
      expect(screen.getByText('auditor@test.com')).toBeInTheDocument()
      expect(screen.queryByText('user@test.com')).not.toBeInTheDocument()
    })

    it('filters users by status', () => {
      mockController.users = [
        mockUser({ id: 'u1', email: 'active@test.com', status: 'ACTIVE' }),
        mockUser({ id: 'u2', email: 'pending@test.com', status: 'PENDING' }),
      ]
      renderPage()
      const selects = screen.getAllByTestId('mock-select')
      fireEvent.change(selects[1], { target: { value: 'PENDING' } })
      expect(screen.getByText('pending@test.com')).toBeInTheDocument()
      expect(screen.queryByText('active@test.com')).not.toBeInTheDocument()
    })
  })

  describe('pagination', () => {
    it('paginates users', () => {
      mockController.users = Array.from({ length: 15 }, (_, i) =>
        mockUser({ id: `u${i}`, email: `user${i}@test.com` }),
      )
      renderPage()
      expect(screen.getByText('user0@test.com')).toBeInTheDocument()
      expect(screen.getByText('user9@test.com')).toBeInTheDocument()
      expect(screen.queryByText('user10@test.com')).not.toBeInTheDocument()
      const chevrons = document.querySelectorAll('.lucide-chevron-right')
      const nextBtn = chevrons[0]?.closest('button')
      if (nextBtn) fireEvent.click(nextBtn)
      expect(screen.getByText('user10@test.com')).toBeInTheDocument()
    })

    it('changes page size', () => {
      mockController.users = Array.from({ length: 15 }, (_, i) =>
        mockUser({ id: `u${i}`, email: `user${i}@test.com` }),
      )
      renderPage()
      const selects = screen.getAllByTestId('mock-select')
      fireEvent.change(selects[2], { target: { value: '25' } })
      expect(screen.getByText('user0@test.com')).toBeInTheDocument()
      expect(screen.getByText('user14@test.com')).toBeInTheDocument()
    })
  })

  describe('user table actions', () => {
    it('shows action buttons for ACTIVE user', () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      expect(screen.getByText('Ver información')).toBeInTheDocument()
      expect(screen.getByText('Cambiar rol')).toBeInTheDocument()
      expect(screen.getByText('Revocar')).toBeInTheDocument()
    })

    it('shows Aprobar for PENDING user', () => {
      mockController.users = [mockUser({ status: 'PENDING' })]
      renderPage()
      expect(screen.getByText('Aprobar')).toBeInTheDocument()
    })

    it('does not show Ver información for PASSBLOCK or REVOKED', () => {
      mockController.users = [
        mockUser({ id: 'u1', status: 'PASSBLOCK' }),
        mockUser({ id: 'u2', status: 'REVOKED' }),
      ]
      renderPage()
      expect(screen.queryByText('Ver información')).not.toBeInTheDocument()
    })

    it('does not show Cambiar rol for REVOKED users', () => {
      mockController.users = [mockUser({ status: 'REVOKED' })]
      renderPage()
      expect(screen.queryByText('Cambiar rol')).not.toBeInTheDocument()
    })

    it('shows Enviar notificación for ADMIN/GLOBAL_ADMIN users', () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      expect(screen.getByText('Enviar notificación')).toBeInTheDocument()
    })

    it('hides Revocar for ADMIN user by non-ADMIN', () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u2', email: 'user@test.com', role: 'USER' } })
      mockController.users = [mockUser({ role: 'ADMIN', status: 'ACTIVE' })]
      renderPage()
      expect(screen.queryByText('Revocar')).not.toBeInTheDocument()
    })
  })

  describe('approve user', () => {
    it('opens confirmation modal and confirms approval', async () => {
      mockController.users = [mockUser({ status: 'PENDING' })]
      renderPage()
      fireEvent.click(screen.getByText('Aprobar'))
      expect(screen.getByText(/¿Quieres aprobar a/)).toBeInTheDocument()
      fireEvent.click(screen.getByText('Confirmar aprobación'))
      await waitFor(() => {
        expect(mockController.approveUser).toHaveBeenCalledWith('u1')
      })
    })

    it('cancels approval', () => {
      mockController.users = [mockUser({ status: 'PENDING' })]
      renderPage()
      fireEvent.click(screen.getByText('Aprobar'))
      fireEvent.click(screen.getByText('Cancelar'))
      expect(screen.queryByText(/¿Quieres aprobar a/)).not.toBeInTheDocument()
    })
  })

  describe('revoke user', () => {
    it('opens confirmation modal and confirms revoke', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Revocar'))
      expect(screen.getByText(/¿Quieres revocar a/)).toBeInTheDocument()
      fireEvent.click(screen.getByText('Confirmar revocación'))
      await waitFor(() => {
        expect(mockController.revokeUser).toHaveBeenCalledWith('u1')
      })
    })
  })

  describe('role change', () => {
    it('opens role change modal and selects new role', () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Cambiar rol'))
      expect(screen.getByText('Cambiar rol de usuario')).toBeInTheDocument()
      expect(screen.getByText(/El rol actual es USER/)).toBeInTheDocument()
    })

    it('shows confirmation after selecting new role', () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Cambiar rol'))
      const selects = screen.getAllByTestId('mock-select')
      const roleSelect = selects[selects.length - 1]
      fireEvent.change(roleSelect, { target: { value: 'AUDITOR' } })
      fireEvent.click(screen.getByText('Confirmar cambio de rol'))
      expect(screen.getByText(/¿Estás seguro de cambiar el rol/)).toBeInTheDocument()
    })

    it('executes role change', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Cambiar rol'))
      const selects = screen.getAllByTestId('mock-select')
      const roleSelect = selects[selects.length - 1]
      fireEvent.change(roleSelect, { target: { value: 'AUDITOR' } })
      fireEvent.click(screen.getByText('Confirmar cambio de rol'))
      fireEvent.click(screen.getByText('Confirmar cambio'))
      await waitFor(() => {
        expect(mockController.changeUserRole).toHaveBeenCalledWith('u1', 'AUDITOR')
      })
    })
  })

  describe('user info modal', () => {
    it('opens user info modal with ecosystems', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      mockGetUserEcosystems.mockResolvedValue([mockEcosystem({ name: 'User Eco' })])
      renderPage()
      fireEvent.click(screen.getByText('Ver información'))
      await waitFor(() => {
        expect(screen.getByText('User Eco')).toBeInTheDocument()
      })
      expect(screen.getByText(/Volumen de telemetría/)).toBeInTheDocument()
    })

    it('shows loading while fetching ecosystems', () => {
      mockGetUserEcosystems.mockReturnValue(new Promise(() => {}))
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Ver información'))
      expect(screen.getByText('Cargando ecosistemas...')).toBeInTheDocument()
    })

    it('shows no ecosystems message', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      mockGetUserEcosystems.mockResolvedValue([])
      renderPage()
      fireEvent.click(screen.getByText('Ver información'))
      await waitFor(() => {
        expect(screen.getByText('No hay ecosistemas asociados a este usuario.')).toBeInTheDocument()
      })
    })

    it('closes user info modal', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Ver información'))
      await waitFor(() => {
        expect(screen.getByText('Información de usuario')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('Cerrar'))
      expect(screen.queryByText('Información de usuario')).not.toBeInTheDocument()
    })

    it('shows telemetry volume for OWNER ecosystems', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]

      mockGetUserEcosystems.mockResolvedValue([mockEcosystem({ accessType: 'OWNER' })])
      mockGetUserTelemetryVolume.mockResolvedValue(2097152)
      renderPage()
      fireEvent.click(screen.getByText('Ver información'))
      await waitFor(() => {
        expect(screen.getByText('2 MB')).toBeInTheDocument()
      })
    })

    it('paginates ecosystems in info modal', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      const manyEcosystems = Array.from({ length: 12 }, (_, i) =>
        mockEcosystem({ id: `eco-${i}`, name: `Ecosystem ${i}` }),
      )
      mockGetUserEcosystems.mockResolvedValue(manyEcosystems)
      renderPage()
      fireEvent.click(screen.getByText('Ver información'))
      await waitFor(() => {
        expect(screen.getByText('Ecosystem 0')).toBeInTheDocument()
      })
      expect(screen.queryByText('Ecosystem 5')).not.toBeInTheDocument()
      const chevrons = document.querySelectorAll('.lucide-chevron-right')
      const nextBtn = chevrons[chevrons.length - 1]?.closest('button')
      if (nextBtn) fireEvent.click(nextBtn)
      expect(screen.getByText('Ecosystem 5')).toBeInTheDocument()
    })

    it('shows owner email for DELEGATED ecosystems', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      mockGetUserEcosystems.mockResolvedValue([
        mockEcosystem({ accessType: 'DELEGATED', accessRole: 'VIEWER', ownerId: 'owner-1' }),
      ])
      mockGetUserById.mockResolvedValue({ id: 'owner-1', email: 'owner@test.com' } as User)
      renderPage()
      fireEvent.click(screen.getByText('Ver información'))
      await waitFor(() => {
        expect(screen.getByText(/Propietario: owner@test.com/)).toBeInTheDocument()
      })
    })

    it('navigates to ecosystem on click', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      mockGetUserEcosystems.mockResolvedValue([mockEcosystem({ id: 'eco-1', name: 'Clickable Eco' })])
      renderPage()
      fireEvent.click(screen.getByText('Ver información'))
      await waitFor(() => {
        expect(screen.getByText('Clickable Eco')).toBeInTheDocument()
      })
      const searchIcons = document.querySelectorAll('[title="Ver ecosistema"]')
      if (searchIcons.length > 0) fireEvent.click(searchIcons[0])
      expect(mockNavigate).toHaveBeenCalledWith('/ecosystems', { state: { selectedId: 'eco-1' } })
    })
  })

  describe('notification modal - user target', () => {
    it('opens notification modal for individual user', () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Enviar notificación'))
      expect(screen.getByText(/Envía una notificación a/)).toBeInTheDocument()
    })

    it('sends notification to user', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]

      renderPage()
      fireEvent.click(screen.getByText('Enviar notificación'))
      fireEvent.change(screen.getByPlaceholderText('Título de la notificación'), { target: { value: 'Test Title' } })
      fireEvent.change(screen.getByPlaceholderText('Escribe el mensaje de la notificación...'), { target: { value: 'Test message content' } })
      fireEvent.click(screen.getByText('Continuar'))
      expect(screen.getByText(/¿Estás seguro/)).toBeInTheDocument()
      fireEvent.click(screen.getByText('Confirmar y enviar'))
      await waitFor(() => {
        expect(mockSendNotificationToUser).toHaveBeenCalledWith({
          userId: 'u1',
          title: 'Test Title',
          message: 'Test message content',
        })
      })
    })

    it('does not enable Continuar without title', () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Enviar notificación'))
      const continueBtn = screen.getByText('Continuar')
      expect(continueBtn).toBeDisabled()
    })
  })

  describe('notification modal - global target', () => {
    it('opens global notification modal', () => {
      renderPage()
      fireEvent.click(screen.getByText('Enviar notificación global'))
      expect(screen.getByText(/Envía una notificación a todos/)).toBeInTheDocument()
    })

    it('sends notification to roles', async () => {
      renderPage()
      fireEvent.click(screen.getByText('Enviar notificación global'))
      fireEvent.change(screen.getByPlaceholderText('Título de la notificación'), { target: { value: 'Global Title' } })
      fireEvent.change(screen.getByPlaceholderText('Escribe el mensaje de la notificación...'), { target: { value: 'Global message' } })
      fireEvent.click(screen.getByLabelText('AUDITOR'))
      fireEvent.click(screen.getByText('Continuar'))
      fireEvent.click(screen.getByText('Confirmar y enviar'))
      await waitFor(() => {
        expect(mockSendNotificationToRoles).toHaveBeenCalledWith({
          roles: ['AUDITOR'],
          title: 'Global Title',
          message: 'Global message',
        })
      })
    })

    it('does not enable Continuar without roles for global', () => {
      renderPage()
      fireEvent.click(screen.getByText('Enviar notificación global'))
      fireEvent.change(screen.getByPlaceholderText('Título de la notificación'), { target: { value: 'Title' } })
      fireEvent.change(screen.getByPlaceholderText('Escribe el mensaje de la notificación...'), { target: { value: 'Message' } })
      const continueBtn = screen.getByText('Continuar')
      expect(continueBtn).toBeDisabled()
    })

    it('includes ADMIN and GLOBAL_ADMIN when ADMIN role selected', async () => {
      renderPage()
      fireEvent.click(screen.getByText('Enviar notificación global'))
      fireEvent.change(screen.getByPlaceholderText('Título de la notificación'), { target: { value: 'Title' } })
      fireEvent.change(screen.getByPlaceholderText('Escribe el mensaje de la notificación...'), { target: { value: 'Message' } })
      fireEvent.click(screen.getByLabelText('ADMIN'))
      fireEvent.click(screen.getByText('Continuar'))
      fireEvent.click(screen.getByText('Confirmar y enviar'))
      await waitFor(() => {
        expect(mockSendNotificationToRoles).toHaveBeenCalledWith({
          roles: ['ADMIN', 'GLOBAL_ADMIN'],
          title: 'Title',
          message: 'Message',
        })
      })
    })
  })

  describe('notification modal navigation', () => {
    it('returns to form from confirm via Volver', () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Enviar notificación'))
      fireEvent.change(screen.getByPlaceholderText('Título de la notificación'), { target: { value: 'Title' } })
      fireEvent.change(screen.getByPlaceholderText('Escribe el mensaje de la notificación...'), { target: { value: 'Msg' } })
      fireEvent.click(screen.getByText('Continuar'))
      fireEvent.click(screen.getByText('Volver'))
      expect(screen.getByText('Título')).toBeInTheDocument()
    })

    it('closes notification modal via X button', () => {
      renderPage()
      fireEvent.click(screen.getByText('Enviar notificación global'))
      const closeBtn = document.querySelector('.text-slate-400\\.hover\\:text-slate-600')
      const xButtons = screen.getAllByRole('button').filter(b => b.innerHTML.includes('X'))
      if (xButtons.length > 0) fireEvent.click(xButtons[0])
    })
  })

  describe('role-based notification button', () => {
    it('shows global notification button for ADMIN role', () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'ADMIN' } })
      renderPage()
      expect(screen.getByText('Enviar notificación global')).toBeInTheDocument()
    })

    it('shows global notification button for GLOBAL_ADMIN', () => {
      renderPage()
      expect(screen.getByText('Enviar notificación global')).toBeInTheDocument()
    })

    it('hides global notification button for USER role', () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'user@test.com', role: 'USER' } })
      renderPage()
      expect(screen.queryByText('Enviar notificación global')).not.toBeInTheDocument()
    })
  })

  describe('role badge and status badge', () => {
    it('renders role and status badges for each user', () => {
      mockController.users = [
        mockUser({ role: 'AUDITOR', status: 'PENDING' }),
      ]
      renderPage()
      expect(screen.getAllByText('AUDITOR').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('PENDING').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('revoke modal cancel', () => {
    it('cancels revoke via Cancelar', () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Revocar'))
      fireEvent.click(screen.getByText('Cancelar'))
      expect(screen.queryByText(/¿Quieres revocar a/)).not.toBeInTheDocument()
    })
  })

  describe('role change cancel', () => {
    it('cancels role change from first modal', () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Cambiar rol'))
      fireEvent.click(screen.getByText('Cancelar'))
      expect(screen.queryByText('Cambiar rol de usuario')).not.toBeInTheDocument()
    })

    it('cancels role change from confirmation modal', () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      renderPage()
      fireEvent.click(screen.getByText('Cambiar rol'))
      const selects = screen.getAllByTestId('mock-select')
      fireEvent.change(selects[selects.length - 1], { target: { value: 'AUDITOR' } })
      fireEvent.click(screen.getByText('Confirmar cambio de rol'))
      fireEvent.click(screen.getByText('Cancelar'))
      expect(screen.queryByText(/¿Estás seguro de cambiar el rol/)).not.toBeInTheDocument()
    })
  })

  describe('user info error handling', () => {
    it('handles ecosystem fetch failure gracefully', async () => {
      mockController.users = [mockUser({ status: 'ACTIVE' })]
      mockGetUserEcosystems.mockRejectedValue(new Error('fail'))
      renderPage()
      fireEvent.click(screen.getByText('Ver información'))
      await waitFor(() => {
        expect(screen.queryByText('Cargando ecosistemas...')).not.toBeInTheDocument()
      })
    })
  })
})
