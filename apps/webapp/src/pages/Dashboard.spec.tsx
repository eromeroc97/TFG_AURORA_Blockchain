import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { apiClient } from '../api/axios'
import Dashboard from './Dashboard'

type MockAuthClaims = {
  sub: string
  role: string
  email: string
  did: string | null
}

let mockAuthClaims: MockAuthClaims = {
  sub: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
  role: 'ADMIN',
  email: 'admin@aurora.es',
  did: null,
}

const mockedApiClient = apiClient as {
  get: jest.Mock
  patch: jest.Mock
  delete: jest.Mock
}

const apiUsers = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user1@aurora.local',
    role: 'USER',
    status: 'ACTIVE',
    did: 'did:aurora:user1',
  },
  {
    id: '71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4',
    email: 'auditor@aurora.local',
    role: 'AUDITOR',
    status: 'ACTIVE',
    did: 'did:aurora:auditor',
  },
  {
    id: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
    email: 'admin@aurora.local',
    role: 'ADMIN',
    status: 'ACTIVE',
    did: 'did:aurora:admin',
  },
  {
    id: 'c1e0c2f1-8f4b-4f2a-9e11-1d2d3c4b5a6f',
    email: 'auditor2@aurora.local',
    role: 'AUDITOR',
    status: 'ACTIVE',
    did: 'did:aurora:auditor2',
  },
  {
    id: '8d7f4f2c-3f1a-4e4e-8a2e-123456789abc',
    email: 'user2@aurora.local',
    role: 'USER',
    status: 'PENDING',
    did: null,
  },
  {
    id: '9d7a4e5f-1b2c-4d5e-8f90-abcdef123456',
    email: 'user3@aurora.local',
    role: 'USER',
    status: 'REVOKED',
    did: null,
  },
]

jest.mock('../api/axios', () => ({
  apiClient: {
    get: jest.fn(),
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
    mockedApiClient.get.mockResolvedValue({ data: apiUsers })
    mockedApiClient.patch.mockReset()
    mockedApiClient.delete.mockReset()
    mockAuthClaims = {
      sub: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
      role: 'ADMIN',
      email: 'admin@aurora.es',
      did: null,
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
    expect(screen.queryByText(/admin@aurora.local/i)).not.toBeInTheDocument()
    expect(mockedApiClient.get).toHaveBeenCalledWith('/users')
    expect(screen.getByTestId('access-map')).toBeInTheDocument()
  })

  it('renders the user dashboard content', () => {
    mockAuthClaims = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      role: 'USER',
      email: 'user@aurora.es',
      did: null,
    }

    render(<Dashboard />)

    expect(screen.getByRole('heading', { level: 1, name: /cybersecurity/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Mis ecosistemas instanciados/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Compartidos conmigo/i })).toBeInTheDocument()
    expect(screen.getByText(/Hogar Inteligente - Toledo Norte/i)).toBeInTheDocument()
    expect(screen.getByText(/Vivienda Segura - Ciudad Real/i)).toBeInTheDocument()
    expect(screen.getByText(/Laboratorio Domótico - Campus UCLM/i)).toBeInTheDocument()
    expect(screen.queryByText(/Piloto Energético - Albacete/i)).not.toBeInTheDocument()
  })

  it('renders the auditor dashboard content', () => {
    mockAuthClaims = {
      sub: '71ac8f45-8d9f-4e03-bfdf-3f0c81a4e7f4',
      role: 'AUDITOR',
      email: 'auditor@aurora.es',
      did: null,
    }

    render(<Dashboard />)

    expect(screen.getByRole('heading', { level: 2, name: /Todos los ecosistemas/i })).toBeInTheDocument()
    expect(screen.getByText(/Hogar Inteligente - Toledo Norte/i)).toBeInTheDocument()
    expect(screen.getByText(/Piloto Energético - Albacete/i)).toBeInTheDocument()
    expect(screen.getByText(/Vivienda Segura - Ciudad Real/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Ver detalles/i)).toHaveLength(4)
  })

  it('keeps the global admin experience aligned with admin', async () => {
    mockAuthClaims = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      role: 'GLOBAL_ADMIN',
      email: 'global-admin@aurora.es',
      did: null,
    }

    render(<Dashboard />)

    await screen.findByText(/user2@aurora.local/i)

    expect(screen.getByRole('heading', { level: 2, name: /Gestión de usuarios/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^Ecosistemas instanciados$/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Ver información/i })).toHaveLength(5)
    expect(screen.getAllByRole('button', { name: /Cambiar rol/i })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: /Revocar/i })).toHaveLength(5)
    expect(screen.getAllByRole('button', { name: /Aprobar/i })).toHaveLength(1)
  })

  it('shows user info action only for active and pending users', async () => {
    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    const activeRow = screen.getByText(/user1@aurora.local/i).closest('tr')
    const pendingRow = screen.getByText(/user2@aurora.local/i).closest('tr')
    const revokedRow = screen.getByText(/user3@aurora.local/i).closest('tr')

    expect(activeRow).not.toBeNull()
    expect(pendingRow).not.toBeNull()
    expect(revokedRow).not.toBeNull()

    expect(within(activeRow as HTMLTableRowElement).getByRole('button', { name: /Ver información/i })).toBeInTheDocument()
    expect(within(pendingRow as HTMLTableRowElement).getByRole('button', { name: /Ver información/i })).toBeInTheDocument()
    expect(within(revokedRow as HTMLTableRowElement).queryByRole('button', { name: /Ver información/i })).not.toBeInTheDocument()
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
    expect(within(modalBody as HTMLElement).getByText(/No disponible/i)).toBeInTheDocument()

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

    const updatedRow = screen.getByText(/auditor@aurora.local/i).closest('tr')
    expect(updatedRow).not.toBeNull()
    expect(within(updatedRow as HTMLTableRowElement).getByText('Revocado')).toBeInTheDocument()
  })

  it('opens a confirmation modal before approving a pending user', async () => {
    mockAuthClaims = {
      sub: 'f46f4f2f-cf3d-4170-a957-6b3f257cf8a5',
      role: 'ADMIN',
      email: 'admin@aurora.es',
      did: 'did:aurora:admin',
    }

    mockedApiClient.patch.mockResolvedValue({
      data: {
        ...apiUsers[4],
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
      expect(mockedApiClient.patch).toHaveBeenCalledWith('/users/8d7f4f2c-3f1a-4e4e-8a2e-123456789abc/approve', {
        adminDid: 'did:aurora:admin',
      })
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
        role: 'AUDITOR',
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
      did: null,
    }

    render(<Dashboard />)

    await screen.findByText(/user1@aurora.local/i)

    fireEvent.click(screen.getAllByRole('button', { name: /Cambiar rol/i })[0])

    const select = screen.getByRole('combobox', { name: /Nuevo rol/i })
    expect(within(select).getByRole('option', { name: /ADMIN/i })).toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: /GLOBAL_ADMIN/i })).not.toBeInTheDocument()
  })
})