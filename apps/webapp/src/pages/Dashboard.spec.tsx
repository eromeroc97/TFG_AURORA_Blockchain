import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { apiClient } from '../api/axios'
import Dashboard from './Dashboard'

type MockAuthClaims = {
  sub: string
  role: string
  email: string
}

let mockAuthClaims: MockAuthClaims = {
  sub: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
  role: 'ADMIN',
  email: 'admin@aurora.es',
}

const mockedApiClient = apiClient as {
  get: jest.Mock
  post: jest.Mock
  patch: jest.Mock
  delete: jest.Mock
}

const clipboardWriteTextMock = jest.fn().mockResolvedValue(undefined)

const apiUsers = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user1@aurora.local',
    role: 'USER',
    status: 'ACTIVE',
  },
  {
    id: '71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4',
    email: 'auditor@aurora.local',
    role: 'AUDITOR',
    status: 'ACTIVE',
  },
  {
    id: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
    email: 'admin@aurora.local',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  {
    id: 'c1e0c2f1-8f4b-4f2a-9e11-1d2d3c4b5a6f',
    email: 'auditor2@aurora.local',
    role: 'AUDITOR',
    status: 'ACTIVE',
  },
  {
    id: '8f0f0a2e-1111-4d8f-b1c2-123443211234',
    email: 'admin2@aurora.local',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
  {
    id: '8d7f4f2c-3f1a-4e4e-8a2e-123456789abc',
    email: 'user2@aurora.local',
    role: 'USER',
    status: 'PENDING',
  },
  {
    id: '9d7a4e5f-1b2c-4d5e-8f90-abcdef123456',
    email: 'user3@aurora.local',
    role: 'USER',
    status: 'REVOKED',
  },
  {
    id: '4e4d7c8b-22aa-4a7c-bf1f-111122223333',
    email: 'global-admin@aurora.local',
    role: 'GLOBAL_ADMIN',
    status: 'ACTIVE',
  },
]

const apiEcosystems = [
  {
    id: 'eco-1',
    name: 'Hogar Inteligente - Toledo Norte',
    ownerId: '123e4567-e89b-12d3-a456-426614174000',
    did: 'did:firefly:custom/eco-1',
    certificateFingerprint: null,
    status: 'ACTIVE',
    latitude: 39.8628,
    longitude: -4.0273,
    isOnline: true,
    lastSeen: null,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
  },
  {
    id: 'eco-2',
    name: 'Piloto Energético - Albacete',
    ownerId: '71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4',
    did: 'did:firefly:custom/eco-2',
    certificateFingerprint: null,
    status: 'ACTIVE',
    latitude: 38.9943,
    longitude: -1.8585,
    isOnline: true,
    lastSeen: null,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
  },
  {
    id: 'eco-3',
    name: 'Vivienda Segura - Ciudad Real',
    ownerId: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
    did: 'did:firefly:custom/eco-3',
    certificateFingerprint: null,
    status: 'ACTIVE',
    latitude: 38.9861,
    longitude: -3.9273,
    isOnline: false,
    lastSeen: null,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
  },
  {
    id: 'eco-4',
    name: 'Laboratorio Domótico - Campus UCLM',
    ownerId: '123e4567-e89b-12d3-a456-426614174000',
    did: 'did:firefly:custom/eco-4',
    certificateFingerprint: null,
    status: 'ACTIVE',
    latitude: 39.9898,
    longitude: -3.9072,
    isOnline: true,
    lastSeen: null,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
  },
]

const apiDevices = [
  {
    id: 'dev-1',
    name: 'Sensor de movimiento',
    macAddress: 'AA:BB:CC:DD:EE:01',
    vendor: 'Acme',
    ecosystemId: 'eco-1',
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
  },
  {
    id: 'dev-2',
    name: 'Cámara interior',
    macAddress: 'AA:BB:CC:DD:EE:02',
    vendor: 'Fujitsu',
    ecosystemId: 'eco-1',
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
  },
  {
    id: 'dev-3',
    name: 'Inversor solar',
    macAddress: 'AA:BB:CC:DD:EE:03',
    vendor: 'SolarTech',
    ecosystemId: 'eco-2',
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
  },
]

jest.mock('../api/axios', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('../components/dashboard/AccessMap', () => () => (
  <div data-testid="access-map">Access Map Mock</div>
))

jest.mock('../context/auth-context', () => ({
  useAuth: () => ({
    authClaims: mockAuthClaims,
  }),
}))

describe('Dashboard', () => {
  beforeEach(() => {
    mockedApiClient.get.mockImplementation((url: string) => {
      if (url === '/users') {
        return Promise.resolve({ data: apiUsers })
      }

      if (url === '/ecosystems') {
        return Promise.resolve({ data: apiEcosystems })
      }

      if (url === '/ecosystems/eco-1/api-key') {
        return Promise.resolve({ data: { ecosystemId: 'eco-1', apiKey: 'AUR-EXISTING-KEY-123' } })
      }

      if (url.startsWith('/ecosystems/') && url.endsWith('/devices')) {
        const ecosystemId = url.replace('/ecosystems/', '').replace('/devices', '')
        return Promise.resolve({ data: apiDevices.filter((device) => device.ecosystemId === ecosystemId) })
      }

      if (url.startsWith('/iot/devices/') && url.endsWith('/last-interaction')) {
        const deviceId = url.replace('/iot/devices/', '').replace('/last-interaction', '')
        return Promise.resolve({
          data: {
            lastInteractionAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          },
        })
      }

      if (url.startsWith('/devices/')) {
        const deviceId = url.replace('/devices/', '')
        const device = apiDevices.find((item) => item.id === deviceId)

        if (!device) {
          return Promise.reject(new Error(`Device not found ${deviceId}`))
        }

        return Promise.resolve({ data: device })
      }

      return Promise.reject(new Error(`Unhandled GET mock for ${url}`))
    })
    mockedApiClient.post.mockResolvedValue({
      data: {
        id: 'eco-created-1',
        name: 'Ecosistema Test Usuario',
        ownerId: '123e4567-e89b-12d3-a456-426614174000',
        did: 'did:firefly:custom/eco-created-1',
        certificateFingerprint: null,
        status: 'ACTIVE',
        latitude: null,
        longitude: null,
        isOnline: false,
        lastSeen: null,
        createdAt: '2026-04-20T00:00:00.000Z',
        updatedAt: '2026-04-20T00:00:00.000Z',
        apiKey: 'AUR-CREATED-KEY-123',
      },
    })
    mockedApiClient.patch.mockReset()
    mockedApiClient.patch.mockImplementation((url: string, body: unknown) => {
      if (url.startsWith('/devices/')) {
        const deviceId = url.replace('/devices/', '')
        const device = apiDevices.find((item) => item.id === deviceId)

        if (!device) {
          return Promise.reject(new Error(`Device not found ${deviceId}`))
        }

        const updatedDevice = {
          ...device,
          ...(body as { name?: string }),
          updatedAt: '2026-04-21T00:00:00.000Z',
        }

        return Promise.resolve({ data: updatedDevice })
      }

      return Promise.reject(new Error(`Unhandled PATCH mock for ${url}`))
    })
    mockedApiClient.delete.mockReset()
    mockedApiClient.post.mockClear()
    clipboardWriteTextMock.mockClear()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    })
    mockAuthClaims = {
      sub: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
      role: 'ADMIN',
      email: 'admin@aurora.es',
    }
  })

  it('renders the admin dashboard by default', async () => {
    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    expect(screen.getByRole('heading', { level: 1, name: /cybersecurity/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Gestión de usuarios/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Email/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Rol/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Estado/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Acciones/i })).toBeInTheDocument()
    expect(screen.getByText(/Usuarios activos/i)).toBeInTheDocument()
    expect(screen.getByText(/Usuarios pendientes/i)).toBeInTheDocument()
    expect(screen.getByText(/Usuarios bloqueados/i)).toBeInTheDocument()
    expect(screen.queryByText(/admin@aurora.local/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/global-admin@aurora.local/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/DID:/i)).not.toBeInTheDocument()
    expect(screen.queryByText('123e4567-e89b-12d3-a456-426614174000')).not.toBeInTheDocument()
    expect(mockedApiClient.get).toHaveBeenCalledWith('/users')
    expect(screen.getByTestId('access-map')).toBeInTheDocument()
  })

  it('does not show revoked in status filter options', async () => {
    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    const statusFilter = screen.getByRole('combobox', { name: /Estado/i })
    expect(within(statusFilter).queryByRole('option', { name: /Revocado/i })).not.toBeInTheDocument()
  })

  it('prevents admin users from seeing GLOBAL_ADMIN role filter option', async () => {
    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    const roleFilter = screen.getByRole('combobox', { name: /Rol/i })
    expect(within(roleFilter).queryByRole('option', { name: /GLOBAL_ADMIN/i })).not.toBeInTheDocument()
  })

  it('prevents global admins from seeing GLOBAL_ADMIN role filter option', async () => {
    mockAuthClaims = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      role: 'GLOBAL_ADMIN',
      email: 'global-admin@aurora.es',
    }

    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    const roleFilter = screen.getByRole('combobox', { name: /Rol/i })
    expect(within(roleFilter).queryByRole('option', { name: /GLOBAL_ADMIN/i })).not.toBeInTheDocument()
  })

  it('allows admin to see ADMIN users but not manage their role or revocation', async () => {
    render(<Dashboard />)

    await screen.findByText(/admin2@aurora.local/i)

    const adminRow = screen.getByText(/admin2@aurora.local/i).closest('tr')
    expect(adminRow).not.toBeNull()

    expect(within(adminRow as HTMLTableRowElement).queryByRole('button', { name: /Cambiar rol/i })).not.toBeInTheDocument()
    expect(within(adminRow as HTMLTableRowElement).queryByRole('button', { name: /Revocar/i })).not.toBeInTheDocument()
    expect(within(adminRow as HTMLTableRowElement).getByRole('button', { name: /Ver información/i })).toBeInTheDocument()
  })

  it('filters users by search term', async () => {
    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    fireEvent.change(screen.getByPlaceholderText(/Email/i), {
      target: { value: 'user2@aurora.local' },
    })

    expect(screen.getByText(/user2@aurora.local/i)).toBeInTheDocument()
    expect(screen.queryByText(/user1@aurora.local/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/auditor@aurora.local/i)).not.toBeInTheDocument()
  })

  it('filters users by role and status', async () => {
    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    const roleFilter = screen.getByRole('combobox', { name: /Rol/i })
    const statusFilter = screen.getByRole('combobox', { name: /Estado/i })

    fireEvent.change(roleFilter, { target: { value: 'USER' } })
    fireEvent.change(statusFilter, { target: { value: 'PENDING' } })

    expect(screen.getByText(/user2@aurora.local/i)).toBeInTheDocument()
    expect(screen.queryByText(/user1@aurora.local/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/auditor@aurora.local/i)).not.toBeInTheDocument()
  })

  it('renders the user dashboard content', async () => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
    }

    render(<Dashboard />)

    expect(await screen.findByText(/Hogar Inteligente - Toledo Norte/i)).toBeInTheDocument()

    expect(screen.getByRole('heading', { level: 1, name: /cybersecurity/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Mis ecosistemas instanciados/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Compartidos conmigo/i })).toBeInTheDocument()
    expect(screen.getByText(/Laboratorio Domótico - Campus UCLM/i)).toBeInTheDocument()
    expect(screen.queryByText(/Vivienda Segura - Ciudad Real/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Piloto Energético - Albacete/i)).not.toBeInTheDocument()
  })

  it('registers an ecosystem from modal and allows copying the generated API key', async () => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
    }

    render(<Dashboard />)

    fireEvent.click(screen.getByRole('button', { name: /Registrar ecosistema/i }))

    expect(screen.getByRole('heading', { name: /Registrar ecosistema/i })).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/Mi hogar inteligente/i), {
      target: { value: 'Ecosistema Test Usuario' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }))
    expect(screen.getByText(/se generará una API key única/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Confirmar y generar API key/i }))

    expect(await screen.findByText(/API key generada/i)).toBeInTheDocument()
    expect(await screen.findByText(/Ecosistema Test Usuario/i)).toBeInTheDocument()
    expect(mockedApiClient.post).toHaveBeenCalledWith('/ecosystems', {
      name: 'Ecosistema Test Usuario',
    })

    const ecosystemModal = screen.getByRole('heading', { name: /Registrar ecosistema/i }).closest('div')?.parentElement?.parentElement
    expect(ecosystemModal).not.toBeNull()

    fireEvent.click(within(ecosystemModal as HTMLElement).getByRole('button', { name: /Copiar/i }))

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledTimes(1)
    })

    const generatedApiKey = clipboardWriteTextMock.mock.calls[0][0] as string
    expect(generatedApiKey).toBe('AUR-CREATED-KEY-123')
    expect(screen.queryByText(generatedApiKey)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Compartir ecosistema Ecosistema Test Usuario/i })).toBeInTheDocument()
  })

  it('recovers and copies an existing ecosystem API key on demand', async () => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
    }

    render(<Dashboard />)

    expect(await screen.findByText(/Hogar Inteligente - Toledo Norte/i)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /Recuperar API key/i })[0])

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/ecosystems/eco-1/api-key')
    })

    fireEvent.click(screen.getByRole('button', { name: /Copiar/i }))

    await waitFor(() => {
      expect(clipboardWriteTextMock).toHaveBeenCalledWith('AUR-EXISTING-KEY-123')
    })
  })

  it('shows permission error when API key retrieval is forbidden', async () => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
    }

    mockedApiClient.get.mockImplementation((url: string) => {
      if (url === '/ecosystems') {
        return Promise.resolve({ data: apiEcosystems })
      }

      if (url === '/ecosystems/eco-1/api-key') {
        return Promise.reject({ isAxiosError: true, response: { status: 403 } })
      }

      if (url === '/users') {
        return Promise.resolve({ data: apiUsers })
      }

      return Promise.reject(new Error(`Unhandled GET mock for ${url}`))
    })

    render(<Dashboard />)

    expect(await screen.findByText(/Hogar Inteligente - Toledo Norte/i)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /Recuperar API key/i })[0])

    expect(await screen.findByText(/Tu cuenta no puede completar esta acción/i)).toBeInTheDocument()
  })

  it('shows not-found style error when API key is unavailable', async () => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
    }

    mockedApiClient.get.mockImplementation((url: string) => {
      if (url === '/ecosystems') {
        return Promise.resolve({ data: apiEcosystems })
      }

      if (url === '/ecosystems/eco-1/api-key') {
        return Promise.reject({ isAxiosError: true, response: { status: 404 } })
      }

      if (url === '/users') {
        return Promise.resolve({ data: apiUsers })
      }

      return Promise.reject(new Error(`Unhandled GET mock for ${url}`))
    })

    render(<Dashboard />)

    expect(await screen.findByText(/Hogar Inteligente - Toledo Norte/i)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /Recuperar API key/i })[0])

    expect(await screen.findByText(/El ecosistema solicitado no está disponible/i)).toBeInTheDocument()
  })

  it('renders the auditor dashboard content', async () => {
    mockAuthClaims = {
      sub: '71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4',
      role: 'AUDITOR',
      email: 'auditor@aurora.es',
    }

    render(<Dashboard />)

    expect(await screen.findByText(/Hogar Inteligente - Toledo Norte/i)).toBeInTheDocument()

    expect(screen.getByRole('heading', { level: 2, name: /Todos los ecosistemas/i })).toBeInTheDocument()
    expect(screen.getByText(/Piloto Energético - Albacete/i)).toBeInTheDocument()
    expect(screen.getByText(/Vivienda Segura - Ciudad Real/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Ver detalles/i)).toHaveLength(4)
  })

  it('keeps the global admin experience aligned with admin', async () => {
    mockAuthClaims = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      role: 'GLOBAL_ADMIN',
      email: 'global-admin@aurora.es',
    }

    render(<Dashboard />)

    await screen.findByText(/user2@aurora.local/i)
    await screen.findByText(/global-admin@aurora.local/i)

    expect(screen.getByRole('heading', { level: 2, name: /Gestión de usuarios/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^Ecosistemas instanciados$/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Ver información/i })).toHaveLength(7)
    expect(screen.getAllByRole('button', { name: /Cambiar rol/i })).toHaveLength(6)
    expect(screen.getAllByRole('button', { name: /Revocar/i })).toHaveLength(7)
    expect(screen.getAllByRole('button', { name: /Aprobar/i })).toHaveLength(1)
  })

  it('shows user info action only for active and pending users', async () => {
    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    const activeRow = screen.getByText(/user1@aurora.local/i).closest('tr')
    const pendingRow = screen.getByText(/user2@aurora.local/i).closest('tr')

    expect(activeRow).not.toBeNull()
    expect(pendingRow).not.toBeNull()
    expect(screen.queryByText(/user3@aurora.local/i)).not.toBeInTheDocument()

    expect(within(activeRow as HTMLTableRowElement).getByRole('button', { name: /Ver información/i })).toBeInTheDocument()
    expect(within(pendingRow as HTMLTableRowElement).getByRole('button', { name: /Ver información/i })).toBeInTheDocument()
  })

  it('opens user information modal for active and pending users', async () => {
    render(<Dashboard />)

    await screen.findByText(/user2@aurora.local/i)

    const pendingRow = screen.getByText(/user2@aurora.local/i).closest('tr')
    expect(pendingRow).not.toBeNull()

    fireEvent.click(within(pendingRow as HTMLTableRowElement).getByRole('button', { name: /Ver información/i }))

    const modalHeading = screen.getByRole('heading', { name: /Información de usuario/i })
    const modalBody = modalHeading.closest('div')?.parentElement?.parentElement

    expect(modalBody).not.toBeNull()
    expect(within(modalBody as HTMLElement).getByText(/Email:/i)).toBeInTheDocument()
    expect(within(modalBody as HTMLElement).getByText(/user2@aurora.local/i)).toBeInTheDocument()
    expect(within(modalBody as HTMLElement).getByText(/Estado:/i)).toBeInTheDocument()
    expect(within(modalBody as HTMLElement).getByText(/Pendiente/i)).toBeInTheDocument()
    expect(within(modalBody as HTMLElement).queryByText(/DID:/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Cerrar/i }))

    expect(screen.queryByRole('heading', { name: /Información de usuario/i })).not.toBeInTheDocument()
  })

  it('opens a confirmation modal before revoking an active user', async () => {
    mockedApiClient.delete.mockResolvedValue({
      data: {
        ...apiUsers[1],
        status: 'REVOKED',
      },
    })

    render(<Dashboard />)

    await screen.findByText(/auditor@aurora.local/i)

    const row = screen.getByText(/auditor@aurora.local/i).closest('tr')
    expect(row).not.toBeNull()

    fireEvent.click(within(row as HTMLTableRowElement).getByRole('button', { name: /Revocar/i }))

    expect(screen.getByRole('heading', { name: /Confirmación requerida/i })).toBeInTheDocument()
    expect(screen.getByText(/revocar a auditor@aurora.local/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Confirmar revocación/i }))

    await waitFor(() => {
      expect(mockedApiClient.delete).toHaveBeenCalledWith('/users/71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4')
    })

    expect(screen.queryByText(/auditor@aurora.local/i)).not.toBeInTheDocument()
  })

  it('opens a confirmation modal before approving a pending user', async () => {
    mockedApiClient.patch.mockResolvedValue({
      data: {
        ...apiUsers.find((user) => user.email === 'user2@aurora.local'),
        status: 'ACTIVE',
      },
    })

    render(<Dashboard />)

    await screen.findByText(/user2@aurora.local/i)

    fireEvent.click(screen.getByRole('button', { name: /Aprobar/i }))

    expect(screen.getByRole('heading', { name: /Confirmación requerida/i })).toBeInTheDocument()
    expect(screen.getByText(/aprobar a user2@aurora.local/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Confirmar aprobación/i }))

    await waitFor(() => {
      expect(mockedApiClient.patch).toHaveBeenCalledWith('/users/8d7f4f2c-3f1a-4e4e-8a2e-123456789abc/approve')
    })

    const row = screen.getByText(/user2@aurora.local/i).closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLTableRowElement).getByText('Activo')).toBeInTheDocument()
  })

  it('opens a role-change modal for admins with only USER and AUDITOR options', async () => {
    mockedApiClient.patch.mockResolvedValue({
      data: {
        ...apiUsers[0],
        role: 'AUDITOR',
      },
    })

    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    const row = screen.getByText(/user1@aurora.local/i).closest('tr')
    expect(row).not.toBeNull()

    fireEvent.click(within(row as HTMLTableRowElement).getByRole('button', { name: /Cambiar rol/i }))

    expect(screen.getByRole('heading', { name: /Cambiar rol de usuario/i })).toBeInTheDocument()

    const select = screen.getByRole('combobox', { name: /Nuevo rol/i })
    expect(within(select).getByRole('option', { name: /USER/i })).toBeInTheDocument()
    expect(within(select).getByRole('option', { name: /AUDITOR/i })).toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: /ADMIN/i })).not.toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: /GLOBAL_ADMIN/i })).not.toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'AUDITOR' } })
    fireEvent.click(screen.getByRole('button', { name: /Confirmar cambio de rol/i }))

    await waitFor(() => {
      expect(mockedApiClient.patch).toHaveBeenCalledWith('/users/123e4567-e89b-12d3-a456-426614174000/role', {
        newRole: 'AUDITOR',
      })
    })

    const updatedRow = screen.getByText(/user1@aurora.local/i).closest('tr')
    expect(updatedRow).not.toBeNull()
    expect(within(updatedRow as HTMLTableRowElement).getByText('AUDITOR')).toBeInTheDocument()
  })

  it('allows global admins to assign ADMIN but not GLOBAL_ADMIN', async () => {
    mockAuthClaims = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      role: 'GLOBAL_ADMIN',
      email: 'global-admin@aurora.es',
    }

    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    fireEvent.click(screen.getAllByRole('button', { name: /Cambiar rol/i })[0])

    const select = screen.getByRole('combobox', { name: /Nuevo rol/i })
    expect(within(select).getByRole('option', { name: /ADMIN/i })).toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: /GLOBAL_ADMIN/i })).not.toBeInTheDocument()
  })

  it('opens the ecosystem devices modal and saves an edited device name', async () => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
    }

    render(<Dashboard />)

    const ecosystemButton = await screen.findByRole('button', { name: /^Hogar Inteligente - Toledo Norte$/i })
    fireEvent.click(ecosystemButton)

    expect(await screen.findByRole('heading', { name: /Dispositivos del ecosistema/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sensor de movimiento/i })).toBeInTheDocument()
    expect(await screen.findByText(/ONLINE/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Sensor de movimiento/i }))

    const nameInput = await screen.findByRole('textbox', { name: /Nombre del dispositivo/i })
    expect(nameInput).toHaveValue('Sensor de movimiento')

    fireEvent.change(nameInput, { target: { value: 'Sensor movimiento actualizado' } })
    const saveButton = screen.getByRole('button', { name: /Guardar nombre/i })

    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockedApiClient.patch).toHaveBeenCalledWith('/devices/dev-1', {
        name: 'Sensor movimiento actualizado',
      })
    })

    expect(screen.getByRole('textbox', { name: /Nombre del dispositivo/i })).toHaveValue('Sensor movimiento actualizado')
  })

  it('allows a user to edit the ecosystem name from the devices modal', async () => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
    }

    render(<Dashboard />)

    const ecosystemButton = await screen.findByRole('button', { name: /^Hogar Inteligente - Toledo Norte$/i })
    fireEvent.click(ecosystemButton)

    expect(await screen.findByRole('button', { name: /Editar ecosistema/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Editar ecosistema/i }))

    const ecosystemNameInput = screen.getByRole('textbox', { name: /Nombre del ecosistema/i })
    fireEvent.change(ecosystemNameInput, { target: { value: 'Hogar Inteligente - Toledo Sur' } })
    fireEvent.click(screen.getByRole('button', { name: /Guardar nombre ecosistema/i }))

    expect((await screen.findAllByText(/Hogar Inteligente - Toledo Sur/i)).length).toBeGreaterThan(0)
    expect(screen.getByText(/Nombre del ecosistema actualizado correctamente\./i)).toBeInTheDocument()
  })

  it('allows a user to revoke an ecosystem from the devices modal', async () => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
    }

    render(<Dashboard />)

    const ecosystemButton = await screen.findByRole('button', { name: /^Hogar Inteligente - Toledo Norte$/i })
    fireEvent.click(ecosystemButton)

    expect(await screen.findByRole('button', { name: /Dar de baja ecosistema/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Dar de baja ecosistema/i }))

    expect(await screen.findByRole('heading', { name: /Confirmar baja de ecosistema/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Confirmar baja/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Hogar Inteligente - Toledo Norte$/i })).not.toBeInTheDocument()
    })
  })

  it('prevents admin users from opening ecosystem device details', async () => {
    render(<Dashboard />)

    const ecosystemButton = await screen.findByRole('button', { name: /^Hogar Inteligente - Toledo Norte$/i })
    fireEvent.click(ecosystemButton)

    expect(screen.queryByRole('heading', { name: /Dispositivos del ecosistema/i })).not.toBeInTheDocument()
  })
})