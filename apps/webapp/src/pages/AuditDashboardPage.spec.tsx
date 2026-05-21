import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuditDashboardPage from './AuditDashboardPage'

const mockTimeline = jest.fn()

jest.mock('../services/audit.service', () => ({
  getAuditTimeline: (...args: unknown[]) => mockTimeline(...args),
}))

jest.mock('../components/audit/AuditTimeline', () => ({
  __esModule: true,
  default: () => <div data-testid="audit-timeline" />,
}))

describe('AuditDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows dashes while loading', () => {
    mockTimeline.mockResolvedValueOnce({ timeline: [], pagination: { total: 0, limit: 50, offset: 0 } })
    render(
      <MemoryRouter>
        <AuditDashboardPage />
      </MemoryRouter>,
    )
    const dashes = screen.getAllByText('-')
    expect(dashes).toHaveLength(2)
  })

  it('renders summary cards with discrepancy data', async () => {
    const now = new Date().toISOString()
    mockTimeline.mockResolvedValueOnce({
      timeline: [
        { eventId: '1', timestamp: now, type: 'TELEMETRY', integrityStatus: 'DISCREPANCY', action: 'test', actorName: 'user', blockchainTxId: 'tx1' },
        { eventId: '2', timestamp: now, type: 'TELEMETRY', integrityStatus: 'VERIFIED', action: 'test', actorName: 'user', blockchainTxId: 'tx2' },
        { eventId: '3', timestamp: now, type: 'TELEMETRY', integrityStatus: 'DISCREPANCY', action: 'test', actorName: 'user', blockchainTxId: 'tx3' },
      ],
      pagination: { total: 3, limit: 50, offset: 0 },
    })
    render(
      <MemoryRouter>
        <AuditDashboardPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(mockTimeline).toHaveBeenCalledWith({ limit: 50, offset: 0 })
    })
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders 0% when no discrepancies', async () => {
    const now = new Date().toISOString()
    mockTimeline.mockResolvedValueOnce({
      timeline: [
        { eventId: '1', timestamp: now, type: 'TELEMETRY', integrityStatus: 'VERIFIED', action: 'test', actorName: 'user', blockchainTxId: 'tx1' },
      ],
      pagination: { total: 1, limit: 50, offset: 0 },
    })
    render(
      <MemoryRouter>
        <AuditDashboardPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument()
    })
  })

  it('renders 0% when no telemetry events', async () => {
    mockTimeline.mockResolvedValueOnce({
      timeline: [],
      pagination: { total: 0, limit: 50, offset: 0 },
    })
    render(
      <MemoryRouter>
        <AuditDashboardPage />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument()
    })
  })
})
