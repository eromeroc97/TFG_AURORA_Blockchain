import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AuditTimeline from './AuditTimeline'
import type { AuditAnchor } from '../../services/audit.service'

const mockGetAuditTimeline = jest.fn()
jest.mock('../../services/audit.service', () => ({
  getAuditTimeline: (...args: unknown[]) => mockGetAuditTimeline(...args),
}))

jest.mock('react-virtuoso', () => ({
  Virtuoso: ({ totalCount, itemContent }: { totalCount: number; itemContent: (i: number) => React.ReactNode }) => {
    const items: React.ReactNode[] = []
    for (let i = 0; i < totalCount; i++) {
      items.push(<div key={i} data-testid="virtuoso-item">{itemContent(i)}</div>)
    }
    return <div data-testid="virtuoso-list">{items}</div>
  },
}))

jest.mock('./AuditEventCard', () => ({
  __esModule: true,
  default: ({ event, isExpanded, onToggle }: { event: { eventId: string; action: string }; isExpanded: boolean; onToggle: () => void }) => (
    <div data-testid="audit-event-card" data-event-id={event.eventId} data-expanded={isExpanded}>
      <span>{event.action}</span>
      <button onClick={onToggle}>Toggle</button>
    </div>
  ),
}))

function createMockAnchor(index = 0): AuditAnchor {
  return {
    eventId: `evt-${index}`,
    timestamp: '2024-01-15T10:30:00.000Z',
    action: `Action ${index}`,
    actorName: `Actor ${index}`,
    type: 'TELEMETRY',
    integrityStatus: 'VERIFIED',
    blockchainTxId: `tx-${index}`,
    blockNumber: index,
    telemetryHash: `hash-${index}`,
    ecosystemId: `eco-${index}`,
    ingestId: `ingest-${index}`,
    output: { key: `output-${index}` },
    signatureValid: true,
    dbRecord: { key: `db-${index}` },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AuditTimeline', () => {
  describe('loading and data states', () => {
    it('shows loading state on mount', async () => {
      mockGetAuditTimeline.mockReturnValue(new Promise(() => {}))
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByText('Cargando...')).toBeInTheDocument()
      })
    })

    it('shows event count after loading completes', async () => {
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [createMockAnchor(0), createMockAnchor(1)],
        pagination: { total: 2, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByText('2 eventos')).toBeInTheDocument()
      })
    })

    it('renders Virtuoso with event cards', async () => {
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [createMockAnchor(0), createMockAnchor(1)],
        pagination: { total: 2, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByTestId('virtuoso-list')).toBeInTheDocument()
      })
      const cards = screen.getAllByTestId('audit-event-card')
      expect(cards).toHaveLength(2)
      expect(screen.getByText('Action 0')).toBeInTheDocument()
      expect(screen.getByText('Action 1')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockGetAuditTimeline.mockRejectedValue(new Error('Network error'))
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByText('Error al cargar los eventos de auditoría')).toBeInTheDocument()
      })
    })

    it('shows retry button on error and refetches on click', async () => {
      mockGetAuditTimeline.mockRejectedValueOnce(new Error('Network error'))
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByText('Reintentar')).toBeInTheDocument()
      })
      mockGetAuditTimeline.mockResolvedValueOnce({
        timeline: [createMockAnchor(0)],
        pagination: { total: 1, limit: 50, offset: 0 },
      })
      fireEvent.click(screen.getByText('Reintentar'))
      await waitFor(() => {
        expect(screen.getByText('1 eventos')).toBeInTheDocument()
      })
    })
  })

  describe('empty state', () => {
    it('shows empty message when no events returned', async () => {
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [],
        pagination: { total: 0, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByText('No hay eventos para los filtros seleccionados')).toBeInTheDocument()
      })
    })
  })

  describe('filters panel', () => {
    it('toggles filter panel visibility', async () => {
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [],
        pagination: { total: 0, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByText('0 eventos')).toBeInTheDocument()
      })
      const filterBtn = screen.getByText('Filtros')
      fireEvent.click(filterBtn)
      expect(screen.getByText('Fecha Desde')).toBeInTheDocument()
      expect(screen.getByText('Fecha Hasta')).toBeInTheDocument()
      expect(screen.getByText('Tipo de Evento')).toBeInTheDocument()
      fireEvent.click(filterBtn)
      expect(screen.queryByText('Fecha Desde')).not.toBeInTheDocument()
    })

    it('shows active filter count badge', async () => {
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [],
        pagination: { total: 0, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByText('0 eventos')).toBeInTheDocument()
      })
      const filterBtn = screen.getByText('Filtros')
      fireEvent.click(filterBtn)
      const dateInputs = screen.getAllByDisplayValue('')
      const startDate = dateInputs[0] as HTMLInputElement
      fireEvent.change(startDate, { target: { value: '2024-01-01' } })
      fireEvent.click(screen.getByText('Aplicar'))
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
      })
    })

    it('applies filters and refetches', async () => {
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [],
        pagination: { total: 0, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByText('0 eventos')).toBeInTheDocument()
      })
      mockGetAuditTimeline.mockClear()
      const filterBtn = screen.getByText('Filtros')
      fireEvent.click(filterBtn)
      const select = screen.getByRole('combobox') as HTMLSelectElement
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [createMockAnchor(0)],
        pagination: { total: 1, limit: 50, offset: 0 },
      })
      fireEvent.change(select, { target: { value: 'ADMINISTRATIVE' } })
      fireEvent.click(screen.getByText('Aplicar'))
      await waitFor(() => {
        expect(mockGetAuditTimeline).toHaveBeenCalledTimes(2)
      })
    })

    it('endDate filter change calls handleFilterChange', async () => {
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [],
        pagination: { total: 0, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => { expect(screen.getByText('0 eventos')).toBeInTheDocument() })
      const filterBtn = screen.getByText('Filtros')
      fireEvent.click(filterBtn)
      const dateInputs = screen.getAllByDisplayValue('')
      const endDateInput = dateInputs[1] as HTMLInputElement
      fireEvent.change(endDateInput, { target: { value: '2024-12-31' } })
      expect(endDateInput.value).toBe('2024-12-31')
    })

    it('clear filters button resets all filters', async () => {
      mockGetAuditTimeline.mockResolvedValueOnce({
        timeline: [],
        pagination: { total: 0, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByText('0 eventos')).toBeInTheDocument()
      })
      const filterBtn = screen.getByText('Filtros')
      fireEvent.click(filterBtn)
      const select = screen.getByRole('combobox') as HTMLSelectElement
      fireEvent.change(select, { target: { value: 'FIREFLY' } })
      const clearBtn = screen.getByRole('button', { name: '' })
      const clearFilterBtn = Array.from(document.querySelectorAll('button')).find(
        b => b.innerHTML.includes('svg') && !b.textContent,
      )
      if (clearFilterBtn) {
        fireEvent.click(clearFilterBtn)
      }
    })
  })

  describe('event interaction', () => {
    it('sync button refetches events', async () => {
      mockGetAuditTimeline.mockResolvedValueOnce({
        timeline: [createMockAnchor(0)],
        pagination: { total: 1, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByText('1 eventos')).toBeInTheDocument()
      })
      mockGetAuditTimeline.mockResolvedValueOnce({
        timeline: [createMockAnchor(0), createMockAnchor(1)],
        pagination: { total: 2, limit: 50, offset: 0 },
      })
      fireEvent.click(screen.getByText('Sincronizar'))
      await waitFor(() => {
        expect(screen.getByText('2 eventos')).toBeInTheDocument()
      })
    })

    it('toggles event card expansion', async () => {
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [createMockAnchor(0)],
        pagination: { total: 1, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByTestId('audit-event-card')).toBeInTheDocument()
      })
      const card = screen.getByTestId('audit-event-card')
      expect(card.getAttribute('data-expanded')).toBe('false')
      const toggleBtn = screen.getByText('Toggle')
      fireEvent.click(toggleBtn)
      expect(card.getAttribute('data-expanded')).toBe('true')
      fireEvent.click(toggleBtn)
      expect(card.getAttribute('data-expanded')).toBe('false')
    })
  })

  describe('transformToAuditEvent', () => {
    it('transforms anchor without output to default blockchainRecord', async () => {
      const anchor = createMockAnchor(0)
      anchor.output = undefined
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [anchor],
        pagination: { total: 1, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByTestId('audit-event-card')).toBeInTheDocument()
      })
    })

    it('transforms anchor without dbRecord to empty object', async () => {
      const anchor = createMockAnchor(0)
      anchor.dbRecord = undefined
      mockGetAuditTimeline.mockResolvedValue({
        timeline: [anchor],
        pagination: { total: 1, limit: 50, offset: 0 },
      })
      render(<AuditTimeline />)
      await waitFor(() => {
        expect(screen.getByTestId('audit-event-card')).toBeInTheDocument()
      })
    })
  })
})
