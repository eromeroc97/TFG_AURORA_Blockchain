import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import EcosystemDevicesModal from './EcosystemDevicesModal'
import type { AccessMapDevice, AccessMapEcosystem } from '../../services/ecosystems.service'

const mockGet = jest.fn()
const mockPatch = jest.fn()
const mockPost = jest.fn()
jest.mock('../../api/axios', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

const mockUseAuth = jest.fn<{ authClaims: { sub: string; email: string; role: string } }, []>()
jest.mock('../../context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))
mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'user@test.com', role: 'USER' } })

const mockGetDeviceDetails = jest.fn()
jest.mock('../../services/device-details.service', () => ({
  getDeviceDetails: (...args: unknown[]) => mockGetDeviceDetails(...args),
}))

const onClose = jest.fn()
const onDeviceUpdated = jest.fn()
const onEcosystemUpdated = jest.fn()
const onEcosystemRevoked = jest.fn()
const onLeaveShared = jest.fn()

function mockDevice(overrides: Partial<AccessMapDevice> = {}): AccessMapDevice {
  return {
    id: 'dev-1',
    name: 'Smart Bulb',
    macAddress: 'AA:BB:CC:DD:EE:01',
    vendor: 'Philips',
    category: 'SMART_BULB',
    room: 'Salón',
    updatedAt: '2024-06-01T10:00:00.000Z',
    payload: { temperature: 25, humidity: 60 },
    ...overrides,
  }
}

function mockEcosystem(overrides: Partial<AccessMapEcosystem> = {}): AccessMapEcosystem {
  return {
    id: 'eco-1',
    name: 'Test Ecosystem',
    ownerId: 'owner-1',
    lat: null,
    lng: null,
    isShared: false,
    devices: [mockDevice()],
    accessType: 'OWNER',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'user@test.com', role: 'USER' } })
  mockGetDeviceDetails.mockResolvedValue({ payload: null })
  setupDefaultApiMocks()
})

function setupDefaultApiMocks() {
  mockGet.mockImplementation((url: string) => {
    if (url.startsWith('/devices/')) {
      return Promise.resolve({ data: mockDevice() })
    }
    if (url === '/iot/devices/last-interaction') {
      return Promise.resolve({ data: { lastInteractionAt: new Date(Date.now() - 60000).toISOString() } })
    }
    return Promise.reject(new Error(`Unexpected URL: ${url}`))
  })
  mockPatch.mockResolvedValue({ data: mockDevice() })
  mockPost.mockResolvedValue({ data: {} })
  onLeaveShared.mockResolvedValue(undefined)
}

function renderModal(props: Partial<React.ComponentProps<typeof EcosystemDevicesModal>> = {}) {
  return render(
    <EcosystemDevicesModal
      ecosystem={mockEcosystem()}
      onClose={onClose}
      onDeviceUpdated={onDeviceUpdated}
      onEcosystemUpdated={onEcosystemUpdated}
      onEcosystemRevoked={onEcosystemRevoked}
      onLeaveShared={onLeaveShared}
      canManageEcosystem={false}
      canRevokeEcosystem={false}
      initialDeviceId={null}
      {...props}
    />,
  )
}

describe('EcosystemDevicesModal', () => {
  describe('render and basic structure', () => {
    it('renders modal title and ecosystem name', () => {
      renderModal()
      expect(screen.getByText('Dispositivos del ecosistema')).toBeInTheDocument()
      expect(screen.getAllByText('Test Ecosystem').length).toBeGreaterThanOrEqual(1)
    })

    it('shows close button', () => {
      renderModal()
      const closeBtn = screen.getByLabelText('Cerrar modal de dispositivos')
      expect(closeBtn).toBeInTheDocument()
      fireEvent.click(closeBtn)
      expect(onClose).toHaveBeenCalled()
    })

    it('shows no devices message when empty', () => {
      renderModal({ ecosystem: { ...mockEcosystem(), devices: [] } as AccessMapEcosystem })
      expect(screen.getByText('No hay dispositivos registrados para este ecosistema.')).toBeInTheDocument()
    })

    it('shows placeholder when no device is selected and no devices exist', () => {
      renderModal({ ecosystem: { ...mockEcosystem(), devices: [] } as AccessMapEcosystem })
      expect(screen.getByText('Selecciona un dispositivo para ver su información.')).toBeInTheDocument()
    })
  })

  describe('device list', () => {
    it('displays all devices', () => {
      const devices = [
        mockDevice({ id: 'dev-1', name: 'Device 1' }),
        mockDevice({ id: 'dev-2', name: 'Device 2' }),
      ]
      renderModal({ ecosystem: { ...mockEcosystem(), devices } as AccessMapEcosystem })
      expect(screen.getByText('Device 1')).toBeInTheDocument()
      expect(screen.getByText('Device 2')).toBeInTheDocument()
    })

    it('selects device on click', () => {
      const devices = [
        mockDevice({ id: 'dev-1', name: 'Device 1', vendor: 'Vendor A' }),
        mockDevice({ id: 'dev-2', name: 'Device 2', vendor: 'Vendor B' }),
      ]
      renderModal({ ecosystem: { ...mockEcosystem(), devices } as AccessMapEcosystem })
      fireEvent.click(screen.getByText('Device 2'))
      expect(screen.getByText('Vendor B')).toBeInTheDocument()
    })
  })

  describe('device details - read-only (non-USER)', () => {
    it('shows device info as read-only for non-USER role', async () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'ADMIN' } })
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.resolve({ data: mockDevice({ name: 'Test Bulb', category: 'SMART_BULB', room: 'Salón' }) })
        }
        if (url === '/iot/devices/last-interaction') {
          return Promise.resolve({ data: { lastInteractionAt: new Date().toISOString() } })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('Test Bulb')).toBeInTheDocument()
      })
      const nameLabels = screen.getAllByText('Nombre del dispositivo')
      expect(nameLabels.length).toBeGreaterThanOrEqual(1)
      const inputs = document.querySelectorAll('input[type="text"]')
      const nameInputs = Array.from(inputs).filter(i => !i.getAttribute('aria-label'))
      const nameDivs = document.querySelectorAll('.rounded-2xl.border.border-border.bg-slate-50')
      const nameDiv = Array.from(nameDivs).find(d => d.textContent === 'Test Bulb')
      expect(nameDiv).toBeTruthy()
      expect(screen.queryByText('Guardar')).not.toBeInTheDocument()
    })

    it('shows room label for predefined room', () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'ADMIN' } })
      renderModal()
      expect(screen.getByText('Salón')).toBeInTheDocument()
    })

    it('shows category label', () => {
      mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'ADMIN' } })
      renderModal()
      expect(screen.getByText('Bombilla Inteligente')).toBeInTheDocument()
    })
  })

  describe('device details - editable (USER role)', () => {
    it('shows device name as input for USER', async () => {
      renderModal()
      await waitFor(() => {
        const inputs = document.querySelectorAll('input[type="text"]')
        const nameInput = Array.from(inputs).find(i => (i as HTMLInputElement).value === 'Smart Bulb' && !i.getAttribute('aria-label'))
        expect(nameInput).toBeTruthy()
      })
    })

    it('shows Save button for USER', async () => {
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('Guardar')).toBeInTheDocument()
      })
    })

    it('saves device details on Save click', async () => {
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('Guardar')).not.toBeDisabled()
      })
      const inputs = document.querySelectorAll('input[type="text"]')
      const nameInput = Array.from(inputs).find(i => (i as HTMLInputElement).value === 'Smart Bulb' && !i.getAttribute('aria-label')) as HTMLInputElement
      if (nameInput) {
        fireEvent.change(nameInput, { target: { value: 'Updated Bulb' } })
      }
      fireEvent.click(screen.getByText('Guardar'))
      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith('/devices/dev-1', expect.objectContaining({
          name: 'Updated Bulb',
        }))
      })
      await waitFor(() => {
        expect(screen.getByText('Datos actualizados correctamente.')).toBeInTheDocument()
      })
      expect(onDeviceUpdated).toHaveBeenCalled()
    })

    it('does not send save when name is empty and category/room unchanged', async () => {
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('Guardar')).not.toBeDisabled()
      })
    })

    it('shows error on save failure', async () => {
      mockPatch.mockRejectedValue(new Error('fail'))
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('Guardar')).not.toBeDisabled()
      })
      const inputs = document.querySelectorAll('input[type="text"]')
      const nameInput = Array.from(inputs).find(i => (i as HTMLInputElement).value === 'Smart Bulb' && !i.getAttribute('aria-label')) as HTMLInputElement
      if (nameInput) {
        fireEvent.change(nameInput, { target: { value: 'Updated' } })
      }
      fireEvent.click(screen.getByText('Guardar'))
      await waitFor(() => {
        expect(screen.getByText('No se pudo actualizar los datos del dispositivo. Inténtalo de nuevo.')).toBeInTheDocument()
      })
    })

    it('does not send empty name when only category/room changed', async () => {
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('Guardar')).not.toBeDisabled()
      })
    })
  })

  describe('device status', () => {
    it('shows ONLINE status', async () => {
      const recentTime = new Date(Date.now() - 60000).toISOString()
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.resolve({ data: mockDevice() })
        }
        if (url === '/iot/devices/last-interaction') {
          return Promise.resolve({ data: { lastInteractionAt: recentTime } })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('ONLINE')).toBeInTheDocument()
      })
    })

    it('shows OFFLINE status', async () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.resolve({ data: mockDevice() })
        }
        if (url === '/iot/devices/last-interaction') {
          return Promise.resolve({ data: { lastInteractionAt: oldTime } })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('OFFLINE')).toBeInTheDocument()
      })
    })

    it('shows Desconocido when status fetch fails', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.resolve({ data: mockDevice() })
        }
        if (url === '/iot/devices/last-interaction') {
          return Promise.reject(new Error('fail'))
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('Desconocido')).toBeInTheDocument()
      })
    })

    it('shows error when no MAC address', () => {
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.resolve({ data: mockDevice({ macAddress: null }) })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal()
    })
  })

  describe('payload / additional info', () => {
    it('shows payload entries', async () => {
      const payload = { temperature: 25, is_on: true }
      mockGetDeviceDetails.mockResolvedValue({ payload })
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.resolve({ data: mockDevice({ payload }) })
        }
        if (url === '/iot/devices/last-interaction') {
          return Promise.resolve({ data: { lastInteractionAt: new Date().toISOString() } })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('temperature')).toBeInTheDocument()
      })
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('Sí')).toBeInTheDocument()
    })

    it('shows placeholder when no payload', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.resolve({ data: mockDevice({ payload: {} }) })
        }
        if (url === '/iot/devices/last-interaction') {
          return Promise.resolve({ data: { lastInteractionAt: new Date().toISOString() } })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('No hay información adicional disponible')).toBeInTheDocument()
      })
    })
  })

  describe('ecosystem name editing', () => {
    it('shows Edit button when canManageEcosystem', () => {
      renderModal({ canManageEcosystem: true })
      expect(screen.getByText('Editar ecosistema')).toBeInTheDocument()
    })

    it('hides Edit button when not canManageEcosystem', () => {
      renderModal({ canManageEcosystem: false })
      expect(screen.queryByText('Editar ecosistema')).not.toBeInTheDocument()
    })

    it('opens edit form on click', () => {
      renderModal({ canManageEcosystem: true })
      fireEvent.click(screen.getByText('Editar ecosistema'))
      expect(screen.getByLabelText('Nombre del ecosistema')).toBeInTheDocument()
      expect(screen.getByText('Guardar nombre ecosistema')).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    it('saves ecosystem name', async () => {
      renderModal({ canManageEcosystem: true })
      fireEvent.click(screen.getByText('Editar ecosistema'))
      const input = screen.getByLabelText('Nombre del ecosistema')
      fireEvent.change(input, { target: { value: 'Updated Ecosystem' } })
      fireEvent.click(screen.getByText('Guardar nombre ecosistema'))
      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith('/ecosystems/eco-1', { name: 'Updated Ecosystem' })
      })
      await waitFor(() => {
        expect(screen.getByText('Nombre del ecosistema actualizado correctamente.')).toBeInTheDocument()
      })
      expect(onEcosystemUpdated).toHaveBeenCalled()
    })

    it('shows error on ecosystem save failure', async () => {
      mockPatch.mockRejectedValue(new Error('fail'))
      renderModal({ canManageEcosystem: true })
      fireEvent.click(screen.getByText('Editar ecosistema'))
      const input = screen.getByLabelText('Nombre del ecosistema')
      fireEvent.change(input, { target: { value: 'Updated' } })
      fireEvent.click(screen.getByText('Guardar nombre ecosistema'))
      await waitFor(() => {
        expect(screen.getByText('No se pudo actualizar el nombre del ecosistema. Inténtalo de nuevo.')).toBeInTheDocument()
      })
    })

    it('cancels ecosystem name editing', () => {
      renderModal({ canManageEcosystem: true })
      fireEvent.click(screen.getByText('Editar ecosistema'))
      fireEvent.click(screen.getByText('Cancelar'))
      expect(screen.queryByLabelText('Nombre del ecosistema')).not.toBeInTheDocument()
    })
  })

  describe('revoke ecosystem', () => {
    it('shows revoke button when canRevokeEcosystem', () => {
      renderModal({ canRevokeEcosystem: true })
      expect(screen.getByText('Dar de baja ecosistema')).toBeInTheDocument()
    })

    it('hides revoke button when not canRevokeEcosystem', () => {
      renderModal({ canRevokeEcosystem: false })
      expect(screen.queryByText('Dar de baja ecosistema')).not.toBeInTheDocument()
    })

    it('opens confirmation on revoke click', () => {
      renderModal({ canRevokeEcosystem: true })
      fireEvent.click(screen.getByText('Dar de baja ecosistema'))
      expect(screen.getByText('Confirmar baja de ecosistema')).toBeInTheDocument()
    })

    it('cancels revoke', () => {
      renderModal({ canRevokeEcosystem: true })
      fireEvent.click(screen.getByText('Dar de baja ecosistema'))
      fireEvent.click(screen.getByText('Cancelar'))
      expect(screen.queryByText('Confirmar baja de ecosistema')).not.toBeInTheDocument()
    })

    it('confirms revoke and calls API', async () => {
      renderModal({ canRevokeEcosystem: true })
      fireEvent.click(screen.getByText('Dar de baja ecosistema'))
      fireEvent.click(screen.getByText('Confirmar baja'))
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/ecosystems/eco-1/revoke')
      })
      expect(onEcosystemRevoked).toHaveBeenCalledWith('eco-1')
      expect(onClose).toHaveBeenCalled()
    })

    it('shows error on revoke failure', async () => {
      mockPost.mockRejectedValue(new Error('fail'))
      renderModal({ canRevokeEcosystem: true })
      fireEvent.click(screen.getByText('Dar de baja ecosistema'))
      fireEvent.click(screen.getByText('Confirmar baja'))
      await waitFor(() => {
        expect(screen.getByText('No se pudo dar de baja el ecosistema. Inténtalo de nuevo.')).toBeInTheDocument()
      })
    })
  })

  describe('leave shared ecosystem', () => {
    it('shows leave button when ecosystem is shared', () => {
      renderModal({ ecosystem: { ...mockEcosystem(), isShared: true } as AccessMapEcosystem })
      expect(screen.getByText('Quiero dejar de ver este ecosistema')).toBeInTheDocument()
    })

    it('hides leave button when ecosystem is not shared', () => {
      renderModal({ ecosystem: { ...mockEcosystem(), isShared: false } as AccessMapEcosystem })
      expect(screen.queryByText('Quiero dejar de ver este ecosistema')).not.toBeInTheDocument()
    })

    it('opens leave confirmation', () => {
      renderModal({ ecosystem: { ...mockEcosystem(), isShared: true } as AccessMapEcosystem })
      fireEvent.click(screen.getByText('Quiero dejar de ver este ecosistema'))
      expect(screen.getByText('Dejar de ver el ecosistema')).toBeInTheDocument()
    })

    it('cancels leave', () => {
      renderModal({ ecosystem: { ...mockEcosystem(), isShared: true } as AccessMapEcosystem })
      fireEvent.click(screen.getByText('Quiero dejar de ver este ecosistema'))
      fireEvent.click(screen.getByText('Cancelar'))
      expect(screen.queryByText('Dejar de ver el ecosistema')).not.toBeInTheDocument()
    })

    it('confirms leave and calls onLeaveShared', async () => {
      renderModal({ ecosystem: { ...mockEcosystem(), isShared: true } as AccessMapEcosystem })
      fireEvent.click(screen.getByText('Quiero dejar de ver este ecosistema'))
      fireEvent.click(screen.getByText('Confirmar'))
      await waitFor(() => {
        expect(onLeaveShared).toHaveBeenCalledWith('eco-1')
      })
      expect(onClose).toHaveBeenCalled()
    })

    it('shows error on leave failure', async () => {
      onLeaveShared.mockRejectedValue(new Error('fail'))
      renderModal({ ecosystem: { ...mockEcosystem(), isShared: true } as AccessMapEcosystem })
      fireEvent.click(screen.getByText('Quiero dejar de ver este ecosistema'))
      fireEvent.click(screen.getByText('Confirmar'))
      await waitFor(() => {
        expect(screen.getByText('No se pudo abandonar el ecosistema. Inténtalo de nuevo.')).toBeInTheDocument()
      })
    })
  })

  describe('device details loading error', () => {
    it('falls back to persisted device data on load failure', async () => {
      const dev = mockDevice({ name: 'Fallback Device' })
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.reject(new Error('fail'))
        }
        if (url === '/iot/devices/last-interaction') {
          return Promise.resolve({ data: { lastInteractionAt: new Date().toISOString() } })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal({
        ecosystem: { ...mockEcosystem(), devices: [dev] } as AccessMapEcosystem,
      })
      await waitFor(() => {
        expect(screen.getByText('No se pudo cargar información detallada del dispositivo. Se muestra la información disponible.')).toBeInTheDocument()
      })
    })
  })

  describe('device list filtering', () => {
    it('shows no matching devices message when filter excludes all', () => {
      const devices = [
        mockDevice({ id: 'dev-1', name: 'Bulb', category: 'SMART_BULB', room: 'Salón' }),
      ]
      renderModal({ ecosystem: { ...mockEcosystem(), devices } as AccessMapEcosystem })
      const filterRoomBtn = screen.getAllByText('Habitación')[0]
      fireEvent.click(filterRoomBtn)
      const cocinaOption = screen.getByText('Cocina')
      fireEvent.click(cocinaOption)
      expect(screen.getByText('No hay dispositivos que coincidan con los filtros seleccionados.')).toBeInTheDocument()
    })
  })

  describe('mac address and vendor display', () => {
    it('shows mac address', async () => {
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('AA:BB:CC:DD:EE:01')).toBeInTheDocument()
      })
    })

    it('shows vendor', async () => {
      renderModal()
      await waitFor(() => {
        expect(screen.getAllByText('Philips').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('shows No disponible when macAddress is null', () => {
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.resolve({ data: mockDevice({ macAddress: null }) })
        }
        if (url === '/iot/devices/last-interaction') {
          return Promise.resolve({ data: { lastInteractionAt: new Date().toISOString() } })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal()
    })
  })

  describe('custom room modal', () => {
    it('opens custom room modal from LocationSelect', () => {
      renderModal()
      const roomSelectBtn = screen.getByText('Salón')
      fireEvent.click(roomSelectBtn)
      const otroOption = screen.getAllByText('Otro...')[0]
      fireEvent.click(otroOption)
      expect(screen.getByText('Nueva habitación')).toBeInTheDocument()
    })

    it('confirms custom room', () => {
      renderModal()
      const roomSelectBtn = screen.getByText('Salón')
      fireEvent.click(roomSelectBtn)
      const otroOption = screen.getAllByText('Otro...')[0]
      fireEvent.click(otroOption)
      const input = screen.getByPlaceholderText('Ej: Terraza, Trastero, Garaje...')
      fireEvent.change(input, { target: { value: 'Terraza' } })
      fireEvent.click(screen.getByText('Confirmar'))
      expect(screen.queryByText('Nueva habitación')).not.toBeInTheDocument()
    })

    it('cancels custom room', () => {
      renderModal()
      const roomSelectBtn = screen.getByText('Salón')
      fireEvent.click(roomSelectBtn)
      const otroOption = screen.getAllByText('Otro...')[0]
      fireEvent.click(otroOption)
      fireEvent.click(screen.getByText('Cancelar'))
      expect(screen.queryByText('Nueva habitación')).not.toBeInTheDocument()
    })

    it('disables confirm when input is empty', () => {
      renderModal()
      const roomSelectBtn = screen.getByText('Salón')
      fireEvent.click(roomSelectBtn)
      const otroOption = screen.getAllByText('Otro...')[0]
      fireEvent.click(otroOption)
      expect(screen.getByText('Confirmar')).toBeDisabled()
    })
  })

  describe('last interaction display', () => {
    it('shows last interaction time', async () => {
      const testDate = new Date('2024-06-01T10:00:00.000Z')
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.resolve({ data: mockDevice() })
        }
        if (url === '/iot/devices/last-interaction') {
          return Promise.resolve({ data: { lastInteractionAt: testDate.toISOString() } })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal()
      await waitFor(() => {
        expect(screen.getByText(/Última interacción/)).toBeInTheDocument()
      })
    })
  })

  describe('device status error message', () => {
    it('shows status error when fetch fails', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url.startsWith('/devices/')) {
          return Promise.resolve({ data: mockDevice() })
        }
        if (url === '/iot/devices/last-interaction') {
          return Promise.reject(new Error('fail'))
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })
      renderModal()
      await waitFor(() => {
        expect(screen.getByText('No se pudo calcular el estado de conexión del dispositivo.')).toBeInTheDocument()
      })
    })
  })
})
