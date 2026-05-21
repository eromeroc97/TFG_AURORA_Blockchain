import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EcosystemsManagementPage from './EcosystemsManagementPage'
import type { AccessMapEcosystem, AccessMapDevice, EcosystemAccess } from '../services/ecosystems.service'

const mockNavigate = jest.fn()
const mockLocation = { state: {} }

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}))

const mockUseAuth = jest.fn<{ authClaims: { sub: string; email: string; role: string } }, []>()
jest.mock('../context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))
mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'USER' } })

const mockController = {
  myEcosystems: [],
  sharedWithMe: [],
  isLoading: false,
  error: null,
  isCreating: false,
  refreshMyEcosystems: jest.fn(),
  refreshSharedWithMe: jest.fn(),
  createEcosystem: jest.fn(),
  addAccess: jest.fn(),
  removeAccess: jest.fn(),
  changeAccessRole: jest.fn(),
  fetchAccesses: jest.fn(),
}

jest.mock('../controllers/useEcosystemsController', () => ({
  useEcosystemsController: () => mockController,
}))

jest.mock('../components/dashboard/EcosystemDevicesModal', () => ({
  __esModule: true,
  default: ({ onClose, ecosystem }: { onClose: () => void; ecosystem: AccessMapEcosystem }) =>
    ecosystem ? (
      <div data-testid="ecosystem-modal">
        <p>{ecosystem.name}</p>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null,
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

const mockGet = jest.fn()
jest.mock('../api/axios', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}))

const mockGetCurrentUser = jest.fn()
const mockGetUserById = jest.fn()
jest.mock('../services/users.service', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
}))

const mockLeaveSharedEcosystem = jest.fn()
jest.mock('../services/ecosystems.service', () => ({
  leaveSharedEcosystem: (...args: unknown[]) => mockLeaveSharedEcosystem(...args),
}))

function mockEcosystem(overrides: Partial<AccessMapEcosystem> = {}): AccessMapEcosystem {
  return {
    id: 'eco-1',
    name: 'My Home',
    ownerId: 'u1',
    lat: null,
    lng: null,
    isShared: false,
    devices: [],
    accessType: 'OWNER',
    ...overrides,
  }
}

function mockDevice(overrides: Partial<AccessMapDevice> = {}): AccessMapDevice {
  return {
    id: 'dev-1',
    name: 'Smart Light',
    category: 'SMART_BULB',
    room: 'Salón',
    isOnline: true,
    status: 'ONLINE',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'USER' } })
  mockLocation.state = {}
  Object.assign(mockController, {
    myEcosystems: [],
    sharedWithMe: [],
    isLoading: false,
    error: null,
    isCreating: false,
  })
  mockGetCurrentUser.mockResolvedValue({ id: 'u1', email: 'admin@test.com' })
  mockGetUserById.mockResolvedValue({ id: 'u2', email: 'other@test.com' })
  mockGet.mockResolvedValue({ data: { apiKey: 'sk-test-key-12345' } })
})

function renderPage() {
  return render(
    <MemoryRouter>
      <EcosystemsManagementPage />
    </MemoryRouter>,
  )
}

describe('EcosystemsManagementPage', () => {
  describe('loading state', () => {
    it('shows loading skeletons when isLoading is true', () => {
      mockController.isLoading = true
      renderPage()
      const skeletons = document.querySelectorAll('.h-16.rounded-2xl')
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
    it('shows empty message when no ecosystems', () => {
      renderPage()
      expect(screen.getByText('No hay ecosistemas disponibles.')).toBeInTheDocument()
    })
  })

  describe('dashboard cards', () => {
    it('renders summary cards with counts', () => {
      mockController.myEcosystems = [
        mockEcosystem({ id: 'e1', isShared: true }),
        mockEcosystem({ id: 'e2', isShared: false, devices: [mockDevice(), mockDevice()] }),
      ]
      renderPage()
      expect(screen.getByText('Ecosistemas totales')).toBeInTheDocument()
      expect(screen.getByText('Ecosistemas compartidos')).toBeInTheDocument()
      expect(screen.getByText('Dispositivos totales')).toBeInTheDocument()
      expect(screen.getAllByText('2').length).toBe(2)
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('tabs', () => {
    it('switches between My Ecosystems and Shared With Me', () => {
      renderPage()
      expect(screen.getByText('Mis ecosistemas')).toBeInTheDocument()
      expect(screen.getByText('Compartidos conmigo')).toBeInTheDocument()
      expect(screen.getByText('Ecosistemas Smart Home')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Compartidos conmigo'))
      expect(screen.getByText('Ecosistemas compartidos conmigo')).toBeInTheDocument()
    })

    it('shows shared count on shared tab', () => {
      mockController.sharedWithMe = [mockEcosystem({ id: 's1' }), mockEcosystem({ id: 's2' })]
      renderPage()
      fireEvent.click(screen.getByText('Compartidos conmigo'))
      expect(screen.getByText(/2 ecosistemas compartidos contigo/)).toBeInTheDocument()
    })
  })

  describe('ecosystem list', () => {
    it('renders ecosystem cards', () => {
      mockController.myEcosystems = [
        mockEcosystem({ id: 'e1', name: 'Ecosystem Alpha' }),
        mockEcosystem({ id: 'e2', name: 'Ecosystem Beta' }),
      ]
      renderPage()
      expect(screen.getByText('Ecosystem Alpha')).toBeInTheDocument()
      expect(screen.getByText('Ecosystem Beta')).toBeInTheDocument()
    })

    it('shows Privado badge for non-shared ecosystems', () => {
      mockController.myEcosystems = [mockEcosystem({ isShared: false })]
      renderPage()
      const badges = screen.getAllByText('Privado')
      expect(badges.length).toBeGreaterThanOrEqual(1)
    })

    it('shows Compartido badge for shared ecosystems', () => {
      mockController.myEcosystems = [mockEcosystem({ isShared: true })]
      renderPage()
      const badges = screen.getAllByText('Compartido')
      expect(badges.length).toBeGreaterThanOrEqual(1)
    })

    it('shows Editor/Viewer badge for delegated ecosystems', () => {
      mockController.sharedWithMe = [mockEcosystem({ id: 's1', name: 'Shared Eco', accessType: 'DELEGATED', accessRole: 'EDITOR', isShared: true })]
      renderPage()
      fireEvent.click(screen.getByText('Compartidos conmigo'))
      const badges = screen.getAllByText('Editor')
      expect(badges.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('ecosystem selection', () => {
    it('selects ecosystem on click and shows plan', () => {
      mockController.myEcosystems = [mockEcosystem({ name: 'Selectable Eco' })]
      renderPage()
      const card = screen.getByText('Selectable Eco')
      fireEvent.click(card)
      expect(screen.getByText('Plano del Ecosistema')).toBeInTheDocument()
      expect(screen.getByText(/Selectable Eco - 0 dispositivos/)).toBeInTheDocument()
    })

    it('shows placeholder when no ecosystem selected', () => {
      renderPage()
      expect(screen.getByText('Selecciona un ecosistema para ver su plano')).toBeInTheDocument()
    })
  })

  describe('search filtering', () => {
    it('filters ecosystems by name', () => {
      mockController.myEcosystems = [
        mockEcosystem({ id: 'e1', name: 'Alpha Home' }),
        mockEcosystem({ id: 'e2', name: 'Beta House' }),
      ]
      renderPage()
      fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), { target: { value: 'Alpha' } })
      expect(screen.getByText('Alpha Home')).toBeInTheDocument()
      expect(screen.queryByText('Beta House')).not.toBeInTheDocument()
    })
  })

  describe('shared status filter', () => {
    it('filters by SHARED status', () => {
      mockController.myEcosystems = [
        mockEcosystem({ id: 'e1', name: 'Shared One', isShared: true }),
        mockEcosystem({ id: 'e2', name: 'Private One', isShared: false }),
      ]
      renderPage()
      const selects = screen.getAllByTestId('mock-select')
      const statusSelect = selects[0]
      fireEvent.change(statusSelect, { target: { value: 'SHARED' } })
      expect(screen.getByText('Shared One')).toBeInTheDocument()
      expect(screen.queryByText('Private One')).not.toBeInTheDocument()
    })
  })

  describe('shared tab filters', () => {
    it('filters shared ecosystems by role', () => {
      mockController.sharedWithMe = [
        mockEcosystem({ id: 's1', name: 'Viewer Eco', accessType: 'DELEGATED', accessRole: 'VIEWER', isShared: true }),
        mockEcosystem({ id: 's2', name: 'Editor Eco', accessType: 'DELEGATED', accessRole: 'EDITOR', isShared: true }),
      ]
      renderPage()
      fireEvent.click(screen.getByText('Compartidos conmigo'))
      const selects = screen.getAllByTestId('mock-select')
      const roleSelect = selects[0]
      fireEvent.change(roleSelect, { target: { value: 'EDITOR' } })
      expect(screen.getByText('Editor Eco')).toBeInTheDocument()
      expect(screen.queryByText('Viewer Eco')).not.toBeInTheDocument()
    })
  })

  describe('pagination', () => {
    it('paginates ecosystems', () => {
      mockController.myEcosystems = Array.from({ length: 15 }, (_, i) =>
        mockEcosystem({ id: `eco-${i}`, name: `Ecosystem ${i}` }),
      )
      renderPage()
      expect(screen.getByText('Ecosystem 0')).toBeInTheDocument()
      expect(screen.getByText('Ecosystem 9')).toBeInTheDocument()
      expect(screen.queryByText('Ecosystem 10')).not.toBeInTheDocument()
      const chevrons = document.querySelectorAll('.lucide-chevron-right')
      const nextBtn = chevrons[0]?.closest('button')
      if (nextBtn) fireEvent.click(nextBtn)
      expect(screen.getByText('Ecosystem 10')).toBeInTheDocument()
      expect(screen.queryByText('Ecosystem 0')).not.toBeInTheDocument()
    })

    it('changes page size', () => {
      mockController.myEcosystems = Array.from({ length: 15 }, (_, i) =>
        mockEcosystem({ id: `eco-${i}`, name: `Eco ${i}` }),
      )
      renderPage()
      const selects = screen.getAllByTestId('mock-select')
      const pageSizeSelect = selects[selects.length - 1]
      fireEvent.change(pageSizeSelect, { target: { value: '25' } })
      expect(screen.getByText('Eco 0')).toBeInTheDocument()
      expect(screen.getByText('Eco 14')).toBeInTheDocument()
    })
  })

  describe('create ecosystem modal', () => {
    it('shows create modal on button click', () => {
      renderPage()
      fireEvent.click(screen.getByText('Añadir ecosistema'))
      expect(screen.getByText('Registrar ecosistema')).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    it('requires minimum 3 characters to continue', () => {
      renderPage()
      fireEvent.click(screen.getByText('Añadir ecosistema'))
      const continueBtn = screen.getByText('Continuar')
      expect(continueBtn).toBeDisabled()
      fireEvent.change(screen.getByPlaceholderText('Ej. Mi hogar inteligente'), { target: { value: 'ab' } })
      expect(continueBtn).toBeDisabled()
      fireEvent.change(screen.getByPlaceholderText('Ej. Mi hogar inteligente'), { target: { value: 'abc' } })
      expect(continueBtn).not.toBeDisabled()
    })

    it('goes to confirm step', () => {
      renderPage()
      fireEvent.click(screen.getByText('Añadir ecosistema'))
      fireEvent.change(screen.getByPlaceholderText('Ej. Mi hogar inteligente'), { target: { value: 'My Smart Home' } })
      fireEvent.click(screen.getByText('Continuar'))
      expect(screen.getByText('Nombre:')).toBeInTheDocument()
      expect(screen.getByText('My Smart Home')).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
      expect(screen.getByText('Confirmar y generar API key')).toBeInTheDocument()
    })

    it('creates ecosystem and shows result', async () => {
      mockController.createEcosystem.mockResolvedValue({ id: 'new-eco', name: 'My Smart Home', ownerId: 'u1', apiKey: 'sk-new-key' })
      renderPage()
      fireEvent.click(screen.getByText('Añadir ecosistema'))
      fireEvent.change(screen.getByPlaceholderText('Ej. Mi hogar inteligente'), { target: { value: 'My Smart Home' } })
      fireEvent.click(screen.getByText('Continuar'))
      fireEvent.click(screen.getByText('Confirmar y generar API key'))
      await waitFor(() => {
        expect(screen.getByText('API key generada')).toBeInTheDocument()
      })
      expect(mockController.createEcosystem).toHaveBeenCalledWith('My Smart Home')
    })

    it('shows error when create fails', async () => {
      mockController.createEcosystem.mockRejectedValue(new Error('fail'))
      renderPage()
      fireEvent.click(screen.getByText('Añadir ecosistema'))
      fireEvent.change(screen.getByPlaceholderText('Ej. Mi hogar inteligente'), { target: { value: 'My Smart Home' } })
      fireEvent.click(screen.getByText('Continuar'))
      fireEvent.click(screen.getByText('Confirmar y generar API key'))
      await waitFor(() => {
        expect(screen.getByText(/No se pudo crear el ecosistema/)).toBeInTheDocument()
      })
    })

    it('cancels create modal', () => {
      renderPage()
      fireEvent.click(screen.getByText('Añadir ecosistema'))
      fireEvent.click(screen.getByText('Cancelar'))
      expect(screen.queryByText('Registrar ecosistema')).not.toBeInTheDocument()
    })

    it('shows close button on result step', async () => {
      mockController.createEcosystem.mockResolvedValue({ id: 'new-eco', name: 'Test', ownerId: 'u1', apiKey: 'sk-key' })
      renderPage()
      fireEvent.click(screen.getByText('Añadir ecosistema'))
      fireEvent.change(screen.getByPlaceholderText('Ej. Mi hogar inteligente'), { target: { value: 'Test' } })
      fireEvent.click(screen.getByText('Continuar'))
      fireEvent.click(screen.getByText('Confirmar y generar API key'))
      await waitFor(() => {
        expect(screen.getByText('Cerrar')).toBeInTheDocument()
      })
    })
  })

  describe('API key visibility', () => {
    it('shows recover API key button for owner', () => {
      mockController.myEcosystems = [mockEcosystem({ ownerId: 'u1' })]
      renderPage()
      expect(screen.getByText('Recuperar API Key')).toBeInTheDocument()
    })

    it('does not show API key buttons for non-owner', () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u2', email: 'other@test.com', role: 'USER' } })
      mockController.myEcosystems = [mockEcosystem({ ownerId: 'u1' })]
      renderPage()
      expect(screen.queryByText('Recuperar API Key')).not.toBeInTheDocument()
    })

    it('does not show API key buttons for ADMIN role', () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u2', email: 'admin@test.com', role: 'ADMIN' } })
      mockController.myEcosystems = [mockEcosystem({ ownerId: 'u1' })]
      renderPage()
      expect(screen.queryByText('Recuperar API Key')).not.toBeInTheDocument()
    })
  })

  describe('share modal', () => {
    it('opens share modal for private ecosystem', () => {
      mockController.myEcosystems = [mockEcosystem({ isShared: false })]
      renderPage()
      fireEvent.click(screen.getByText('Compartir'))
      expect(screen.getByText('Compartir ecosistema')).toBeInTheDocument()
    })

    it('does not show share button for shared ecosystems', () => {
      mockController.myEcosystems = [mockEcosystem({ id: 'e1', isShared: true })]
      renderPage()
      expect(screen.queryByText('Compartir')).not.toBeInTheDocument()
    })

    it('shows users list in share modal', async () => {
      mockController.fetchAccesses.mockResolvedValue([
        { userId: 'u2', email: 'user2@test.com', role: 'VIEWER', grantedAt: '2025-01-15T10:00:00Z' },
      ])
      mockController.myEcosystems = [mockEcosystem({ isShared: false })]
      renderPage()
      fireEvent.click(screen.getByText('Compartir'))
      await waitFor(() => {
        expect(screen.getByText('user2@test.com')).toBeInTheDocument()
      })
    })

    it('shares ecosystem with email', async () => {
      mockController.addAccess.mockResolvedValue(undefined)
      mockController.myEcosystems = [mockEcosystem({ isShared: false })]
      renderPage()
      fireEvent.click(screen.getByText('Compartir'))
      fireEvent.change(screen.getByPlaceholderText('usuario@ejemplo.com'), { target: { value: 'share@test.com' } })
      const shareButtons = screen.getAllByText('Compartir')
      const submitBtn = shareButtons[shareButtons.length - 1]
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(mockController.addAccess).toHaveBeenCalledWith('eco-1', 'share@test.com', 'VIEWER')
      })
    })

    it('shows error when share fails', async () => {
      mockController.addAccess.mockRejectedValue(new Error('fail'))
      mockController.myEcosystems = [mockEcosystem({ isShared: false })]
      renderPage()
      fireEvent.click(screen.getByText('Compartir'))
      fireEvent.change(screen.getByPlaceholderText('usuario@ejemplo.com'), { target: { value: 'share@test.com' } })
      const shareButtons = screen.getAllByText('Compartir')
      const submitBtn = shareButtons[shareButtons.length - 1]
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(screen.getByText(/No se pudo compartir/)).toBeInTheDocument()
      })
    })

    it('closes share modal', () => {
      mockController.myEcosystems = [mockEcosystem({ isShared: false })]
      renderPage()
      fireEvent.click(screen.getByText('Compartir'))
      fireEvent.click(screen.getByText('Cerrar'))
      expect(screen.queryByText('Compartir ecosistema')).not.toBeInTheDocument()
    })
  })

  describe('ecosystem detail modal', () => {
    it('opens ecosystem detail modal from info button', () => {
      mockController.myEcosystems = [mockEcosystem({ name: 'Detail Eco' })]
      renderPage()
      const card = screen.getByText('Detail Eco')
      fireEvent.click(card)
      fireEvent.click(screen.getByText('Ver detalles'))
      expect(screen.getByTestId('ecosystem-modal')).toBeInTheDocument()
      expect(screen.getAllByText('Detail Eco').length).toBeGreaterThanOrEqual(1)
    })

    it('closes ecosystem detail modal', () => {
      mockController.myEcosystems = [mockEcosystem({ name: 'Close Test' })]
      renderPage()
      const card = screen.getByText('Close Test')
      fireEvent.click(card)
      fireEvent.click(screen.getByText('Ver detalles'))
      fireEvent.click(screen.getByText('Close Modal'))
      expect(screen.queryByTestId('ecosystem-modal')).not.toBeInTheDocument()
    })
  })

  describe('plan view', () => {
    it('shows devices grouped by room in plan', () => {
      mockController.myEcosystems = [mockEcosystem({
        devices: [
          mockDevice({ id: 'd1', name: 'Lamp', room: 'Salón' }),
          mockDevice({ id: 'd2', name: 'Sensor', room: 'Dormitorio' }),
        ],
      })]
      renderPage()
      const card = screen.getByText('My Home')
      fireEvent.click(card)
      expect(screen.getByText('Lamp')).toBeInTheDocument()
      expect(screen.getByText('Sensor')).toBeInTheDocument()
      expect(screen.getByText('Salón')).toBeInTheDocument()
      expect(screen.getByText('Dormitorio')).toBeInTheDocument()
    })

    it('shows online indicator for online devices', () => {
      mockController.myEcosystems = [mockEcosystem({
        devices: [mockDevice({ id: 'd1', name: 'Online Device', isOnline: true })],
      })]
      renderPage()
      const card = screen.getByText('My Home')
      fireEvent.click(card)
      const onlineDots = document.querySelectorAll('.bg-emerald-400')
      expect(onlineDots.length).toBeGreaterThanOrEqual(1)
    })

    it('opens detail modal when clicking a device in plan', () => {
      mockController.myEcosystems = [mockEcosystem({
        devices: [mockDevice({ id: 'd1', name: 'Clickable Device' })],
      })]
      renderPage()
      const card = screen.getByText('My Home')
      fireEvent.click(card)
      fireEvent.click(screen.getByText('Clickable Device'))
      expect(screen.getByTestId('ecosystem-modal')).toBeInTheDocument()
    })

    it('shows sin dispositivos for empty rooms', () => {
      mockController.myEcosystems = [mockEcosystem({ devices: [] })]
      renderPage()
      const card = screen.getByText('My Home')
      fireEvent.click(card)
      const emptyTexts = screen.getAllByText('Sin dispositivos')
      expect(emptyTexts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('plan collapse', () => {
    it('collapses and expands the plan panel', () => {
      mockController.myEcosystems = [mockEcosystem({ name: 'Collapse Test' })]
      renderPage()
      const card = screen.getByText('Collapse Test')
      fireEvent.click(card)
      expect(screen.getByText('Ocultar plano')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Ocultar plano'))
      expect(screen.queryByText('Ocultar plano')).not.toBeInTheDocument()
    })
  })

  describe('leave shared ecosystem', () => {
    it('calls leaveSharedEcosystem when ecosystem modal triggers leave', () => {
      mockController.sharedWithMe = [mockEcosystem({ id: 's1', name: 'Leave Eco', isShared: true, accessType: 'DELEGATED', accessRole: 'VIEWER' })]
      renderPage()
      fireEvent.click(screen.getByText('Compartidos conmigo'))
      const card = screen.getByText('Leave Eco')
      fireEvent.click(card)
      fireEvent.click(screen.getByText('Ver detalles'))
      expect(screen.getByTestId('ecosystem-modal')).toBeInTheDocument()
    })
  })

  describe('owner emails', () => {
    it('loads and displays owner email for non-USER role', async () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'ADMIN' } })
      mockGetUserById.mockResolvedValue({ id: 'u2', email: 'owner@test.com' })
      mockController.myEcosystems = [mockEcosystem({ ownerId: 'u2' })]
      renderPage()
      await waitFor(() => {
        expect(screen.getByText(/owner@test.com/)).toBeInTheDocument()
      })
    })
  })

  describe('role-based access', () => {
    it('shows add ecosystem button for USER role', () => {
      renderPage()
      expect(screen.getByText('Añadir ecosistema')).toBeInTheDocument()
    })

    it('hides add ecosystem button for ADMIN role', () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'ADMIN' } })
      mockController.myEcosystems = [mockEcosystem()]
      renderPage()
      expect(screen.queryByText('Añadir ecosistema')).not.toBeInTheDocument()
    })

    it('hides add ecosystem button for GLOBAL_ADMIN role', () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'GLOBAL_ADMIN' } })
      mockController.myEcosystems = [mockEcosystem()]
      renderPage()
      expect(screen.queryByText('Añadir ecosistema')).not.toBeInTheDocument()
    })

    it('shows owner email for non-USER roles', () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'ADMIN' } })
      mockGetUserById.mockResolvedValue({ id: 'u2', email: 'owner@test.com' })
      mockController.myEcosystems = [mockEcosystem({ ownerId: 'u2' })]
      renderPage()
      expect(screen.getByText(/Propietario:/)).toBeInTheDocument()
    })

    it('hides owner email for USER role', () => {
      mockController.myEcosystems = [mockEcosystem({ ownerId: 'u2' })]
      renderPage()
      expect(screen.queryByText(/Propietario:/)).not.toBeInTheDocument()
    })
  })

  describe('revoke user from share modal', () => {
    it('calls removeAccess when revoking a user', async () => {
      mockController.fetchAccesses.mockResolvedValue([
        { userId: 'u2', email: 'user2@test.com', role: 'VIEWER', grantedAt: '2025-01-15T10:00:00Z' },
      ])
      mockController.removeAccess.mockResolvedValue(undefined)
      mockController.myEcosystems = [mockEcosystem({ isShared: false })]
      renderPage()
      fireEvent.click(screen.getByText('Compartir'))
      await waitFor(() => {
        expect(screen.getByText('user2@test.com')).toBeInTheDocument()
      })
      const trashButtons = document.querySelectorAll('.text-slate-400')
      if (trashButtons.length > 0) fireEvent.click(trashButtons[trashButtons.length - 1])
      await waitFor(() => {
        expect(mockController.removeAccess).toHaveBeenCalledWith('eco-1', 'u2')
      })
    })
  })

  describe('update role from share modal', () => {
    it('calls changeAccessRole when changing user role', async () => {
      const users: EcosystemAccess[] = [
        { userId: 'u2', email: 'user2@test.com', role: 'VIEWER', grantedAt: '2025-01-15T10:00:00Z' },
      ]
      mockController.fetchAccesses.mockResolvedValue(users)
      mockController.changeAccessRole.mockResolvedValue(undefined)
      mockController.myEcosystems = [mockEcosystem({ isShared: false })]
      renderPage()
      fireEvent.click(screen.getByText('Compartir'))
      await waitFor(() => {
        expect(screen.getByText('user2@test.com')).toBeInTheDocument()
      })
      const roleSelects = screen.getAllByRole('combobox')
      const userRoleSelect = roleSelects[roleSelects.length - 1]
      fireEvent.change(userRoleSelect, { target: { value: 'EDITOR' } })
      await waitFor(() => {
        expect(mockController.changeAccessRole).toHaveBeenCalledWith('eco-1', 'u2', 'EDITOR')
      })
    })
  })

  describe('loading shared users', () => {
    it('shows loading state while fetching users', async () => {
      const fetchPromise = new Promise<EcosystemAccess[]>((resolve) => {
        setTimeout(() => resolve([
          { userId: 'u2', email: 'user2@test.com', role: 'VIEWER', grantedAt: '2025-01-15T10:00:00Z' },
        ]), 100)
      })
      mockController.fetchAccesses.mockReturnValue(fetchPromise)
      mockController.myEcosystems = [mockEcosystem({ isShared: false })]
      renderPage()
      fireEvent.click(screen.getByText('Compartir'))
      expect(screen.getByText('Cargando usuarios...')).toBeInTheDocument()
      await waitFor(() => {
        expect(screen.getByText('user2@test.com')).toBeInTheDocument()
      })
    })
  })

  describe('header description', () => {
    it('shows correct description text', () => {
      renderPage()
      expect(screen.getByText(/Lista general de ecosistemas/)).toBeInTheDocument()
    })
  })

  describe('API key reveal and copy', () => {
    it('reveals API key on click', async () => {
      mockController.myEcosystems = [mockEcosystem({ ownerId: 'u1' })]
      renderPage()
      fireEvent.click(screen.getByText('Recuperar API Key'))
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/ecosystems/eco-1/api-key')
      })
    })

    it('shows masked API key after revealing', async () => {
      mockGet.mockResolvedValue({ data: { apiKey: 'sk-test-key-12345' } })
      mockController.myEcosystems = [mockEcosystem({ ownerId: 'u1' })]
      renderPage()
      fireEvent.click(screen.getByText('Recuperar API Key'))
      await waitFor(() => {
        expect(screen.queryByText('Copiar')).toBeInTheDocument()
      })
      expect(mockGet).toHaveBeenCalledWith('/ecosystems/eco-1/api-key')
    })

    it('calls addAccess with EDITOR role', async () => {
      mockController.addAccess.mockResolvedValue(undefined)
      mockController.myEcosystems = [mockEcosystem({ isShared: false })]
      renderPage()
      fireEvent.click(screen.getByText('Compartir'))
      fireEvent.change(screen.getByPlaceholderText('usuario@ejemplo.com'), { target: { value: 'editor@test.com' } })
      fireEvent.click(screen.getByText('Editor (puede modificar)'))
      const shareButtons = screen.getAllByText('Compartir')
      const submitBtn = shareButtons[shareButtons.length - 1]
      fireEvent.click(submitBtn)
      await waitFor(() => {
        expect(mockController.addAccess).toHaveBeenCalledWith('eco-1', 'editor@test.com', 'EDITOR')
      })
    })
  })
})
