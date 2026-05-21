import { fireEvent, render, screen } from '@testing-library/react'
import AuditEventCard from './AuditEventCard'
import type { AuditEvent } from './types'

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, ...rest } = props
      return <div {...rest}>{children}</div>
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

jest.mock('./EventDetailPanel', () => ({
  __esModule: true,
  default: ({ event, onClose }: any) => (
    <div data-testid="event-detail-panel">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    eventId: 'evt-001',
    timestamp: '2024-01-15T10:30:00.000Z',
    action: 'Telemetry data received',
    actorName: 'device-001',
    type: 'TELEMETRY',
    integrityStatus: 'VERIFIED',
    blockchainTxId: 'tx-001',
    signatureValid: true,
    details: {
      blockchainRecord: { key: 'blockchain' },
      databaseRecord: { key: 'database' },
    },
    ...overrides,
  }
}

const onToggle = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AuditEventCard', () => {
  it('renders event information', () => {
    const event = makeEvent()
    render(<AuditEventCard event={event} isExpanded={false} onToggle={onToggle} />)
    expect(screen.getByText('Telemetría')).toBeInTheDocument()
    expect(screen.getByText('Telemetry data received')).toBeInTheDocument()
    expect(screen.getByText('device-001')).toBeInTheDocument()
  })

  it('renders ADMINISTRATIVE type label', () => {
    const event = makeEvent({ type: 'ADMINISTRATIVE' })
    render(<AuditEventCard event={event} isExpanded={false} onToggle={onToggle} />)
    expect(screen.getByText('Administrativo')).toBeInTheDocument()
  })

  it('renders FIREFLY type label', () => {
    const event = makeEvent({ type: 'FIREFLY' })
    render(<AuditEventCard event={event} isExpanded={false} onToggle={onToggle} />)
    expect(screen.getByText('FireFly')).toBeInTheDocument()
  })

  it('renders VERIFIED status with Verificado text', () => {
    const event = makeEvent({ integrityStatus: 'VERIFIED' })
    render(<AuditEventCard event={event} isExpanded={false} onToggle={onToggle} />)
    expect(screen.getByText('Verificado')).toBeInTheDocument()
  })

  it('renders DISCREPANCY status with Discrepancia text', () => {
    const event = makeEvent({ integrityStatus: 'DISCREPANCY' })
    render(<AuditEventCard event={event} isExpanded={false} onToggle={onToggle} />)
    expect(screen.getByText('Discrepancia')).toBeInTheDocument()
  })

  it('shows event ID when expanded', () => {
    const event = makeEvent()
    render(<AuditEventCard event={event} isExpanded={true} onToggle={onToggle} />)
    expect(screen.getByText('evt-001')).toBeInTheDocument()
  })

  it('shows EventDetailPanel when expanded', () => {
    const event = makeEvent()
    render(<AuditEventCard event={event} isExpanded={true} onToggle={onToggle} />)
    expect(screen.getByTestId('event-detail-panel')).toBeInTheDocument()
  })

  it('does not show EventDetailPanel when collapsed', () => {
    const event = makeEvent()
    render(<AuditEventCard event={event} isExpanded={false} onToggle={onToggle} />)
    expect(screen.queryByTestId('event-detail-panel')).not.toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const event = makeEvent()
    render(<AuditEventCard event={event} isExpanded={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Telemetría'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
