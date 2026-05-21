import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotificationsPage from './NotificationsPage'

const mockGetNotifications = jest.fn()
const mockMarkAsRead = jest.fn()
const mockAccept = jest.fn()
const mockReject = jest.fn()
const mockRefreshCount = jest.fn()

jest.mock('../services/notifications.service', () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  markAsRead: (...args: unknown[]) => mockMarkAsRead(...args),
  acceptNotification: (...args: unknown[]) => mockAccept(...args),
  rejectNotification: (...args: unknown[]) => mockReject(...args),
}))

jest.mock('../layouts/MainLayout', () => ({
  useRefreshNotificationCount: () => mockRefreshCount,
}))

jest.mock('../components/Select', () => {
  return {
    __esModule: true,
    default: ({ value, onChange, options }: { value: string | number; onChange: (v: string) => void; options: { value: string | number; label: string }[] }) => (
      <select
        data-testid="mock-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    ),
  }
})

const mockNotification = (overrides: Record<string, unknown> = {}) => ({
  id: 'n1',
  category: 'ACTION_EXPECTED',
  type: 'ECOSYSTEM_DELEGATION_REQUEST',
  targetType: 'INDIVIDUAL',
  actorType: 'USER',
  actorId: 'u1',
  actorEmail: 'user@test.com',
  userId: 'u1',
  title: 'Test Notification',
  message: 'This is a test message',
  status: 'PENDING',
  actionUrl: null,
  metadata: null,
  readAt: null,
  respondedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('NotificationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state initially', () => {
    mockGetNotifications.mockResolvedValueOnce([])
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Cargando notificaciones...')).toBeInTheDocument()
  })

  it('shows empty state when no notifications', async () => {
    mockGetNotifications.mockResolvedValueOnce([])
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('No tienes notificaciones')).toBeInTheDocument()
    })
  })

  it('renders notification list', async () => {
    mockGetNotifications.mockResolvedValueOnce([mockNotification()])
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument()
    })
    expect(screen.getByText('This is a test message')).toBeInTheDocument()
  })

  it('opens modal on notification click', async () => {
    mockGetNotifications.mockResolvedValueOnce([mockNotification()])
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Test Notification'))
    expect(screen.getByText('Cerrar')).toBeInTheDocument()
    expect(screen.getByText('Aceptar')).toBeInTheDocument()
    expect(screen.getByText('Rechazar')).toBeInTheDocument()
  })

  it('accepts notification from modal', async () => {
    mockGetNotifications.mockResolvedValueOnce([mockNotification()])
    mockAccept.mockResolvedValueOnce({ respondedAt: new Date().toISOString() })
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Test Notification'))
    fireEvent.click(screen.getByText('Aceptar'))
    await waitFor(() => {
      expect(mockAccept).toHaveBeenCalledWith('n1')
    })
    expect(mockRefreshCount).toHaveBeenCalled()
  })

  it('rejects notification from modal', async () => {
    mockGetNotifications.mockResolvedValueOnce([mockNotification()])
    mockReject.mockResolvedValueOnce({ respondedAt: new Date().toISOString() })
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Test Notification'))
    fireEvent.click(screen.getByText('Rechazar'))
    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith('n1')
    })
    expect(mockRefreshCount).toHaveBeenCalled()
  })

  it('closes modal with Cerrar button', async () => {
    mockGetNotifications.mockResolvedValueOnce([mockNotification()])
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Test Notification'))
    fireEvent.click(screen.getByText('Cerrar'))
    await waitFor(() => {
      expect(screen.queryByText('Aceptar')).not.toBeInTheDocument()
    })
  })

  it('auto-marks as read when closing READ_ONLY pending notification', async () => {
    mockGetNotifications.mockResolvedValueOnce([mockNotification({ category: 'READ_ONLY', status: 'PENDING' })])
    mockMarkAsRead.mockResolvedValueOnce({ readAt: new Date().toISOString() })
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Test Notification'))
    expect(screen.getByText('Cerrar')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cerrar'))
    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith('n1')
    })
    expect(mockRefreshCount).toHaveBeenCalled()
  })

  it('filters notifications by search text', async () => {
    mockGetNotifications.mockResolvedValueOnce([
      mockNotification({ id: 'n1', title: 'Apple' }),
      mockNotification({ id: 'n2', title: 'Banana' }),
    ])
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByPlaceholderText(/Buscar por título o mensaje/i), { target: { value: 'Apple' } })
    await waitFor(() => {
      expect(screen.queryByText('Banana')).not.toBeInTheDocument()
    })
  })

  it('applies status filter', async () => {
    mockGetNotifications.mockResolvedValueOnce([
      mockNotification({ id: 'n1', title: 'Pending One', status: 'PENDING' }),
      mockNotification({ id: 'n2', title: 'Read One', status: 'READ' }),
    ])
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Pending One')).toBeInTheDocument()
    })
    const selects = screen.getAllByTestId('mock-select')
    const statusSelect = selects[0]
    fireEvent.change(statusSelect, { target: { value: 'READ' } })
    await waitFor(() => {
      expect(screen.getByText('Read One')).toBeInTheDocument()
    })
    expect(screen.queryByText('Pending One')).not.toBeInTheDocument()
  })

  it('paginates notifications when more than page size', async () => {
    const manyNotifications = Array.from({ length: 15 }, (_, i) =>
      mockNotification({ id: `n${i}`, title: `Notification ${i}`, createdAt: new Date(2025, 0, 1, i, 0).toISOString() }),
    )
    mockGetNotifications.mockResolvedValueOnce(manyNotifications)
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    await waitFor(() => {
      expect(screen.getByText(/Mostrando 11 a 15/)).toBeInTheDocument()
    })
  })

  it('handles accept service returning null', async () => {
    mockGetNotifications.mockResolvedValueOnce([mockNotification()])
    mockAccept.mockResolvedValueOnce(null)
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Test Notification'))
    fireEvent.click(screen.getByText('Aceptar'))
    await waitFor(() => {
      expect(mockAccept).toHaveBeenCalledWith('n1')
    })
    expect(mockRefreshCount).not.toHaveBeenCalled()
  })

  it('filters by start date', async () => {
    const oldDate = new Date('2024-01-01').toISOString()
    const recentDate = new Date().toISOString()
    mockGetNotifications.mockResolvedValueOnce([
      mockNotification({ id: 'n1', title: 'Old', createdAt: oldDate }),
      mockNotification({ id: 'n2', title: 'Recent', createdAt: recentDate }),
    ])
    const { container } = render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Recent')).toBeInTheDocument()
    })
    const dateInputs = container.querySelectorAll<HTMLInputElement>('input[type="date"]')
    fireEvent.change(dateInputs[0], { target: { value: '2024-06-01' } })
    await waitFor(() => {
      expect(screen.queryByText('Old')).not.toBeInTheDocument()
    })
  })

  it('changes page size', async () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      mockNotification({ id: `n${i}`, title: `N${i}` }),
    )
    mockGetNotifications.mockResolvedValueOnce(many)
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('N0')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByText('N10')).not.toBeInTheDocument()
    })
    const selects = screen.getAllByTestId('mock-select')
    const pageSizeSelect = selects[selects.length - 1]
    fireEvent.change(pageSizeSelect, { target: { value: '25' } })
    await waitFor(() => {
      expect(screen.getByText('N10')).toBeInTheDocument()
    })
  })

  it('handles reject service returning null', async () => {
    mockGetNotifications.mockResolvedValueOnce([mockNotification()])
    mockReject.mockResolvedValueOnce(null)
    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Test Notification'))
    fireEvent.click(screen.getByText('Rechazar'))
    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith('n1')
    })
    expect(mockRefreshCount).not.toHaveBeenCalled()
  })
})
