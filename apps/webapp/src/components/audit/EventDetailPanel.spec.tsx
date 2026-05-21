import { fireEvent, render, screen } from '@testing-library/react'
import EventDetailPanel from './EventDetailPanel'
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

jest.mock('./JsonViewer', () => ({
  __esModule: true,
  default: ({ title }: any) => <div data-testid="json-viewer">{title}</div>,
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
      blockchainRecord: { key: 'blockchain', signature: 'sig123', publicKey: 'pk123' },
      databaseRecord: { key: 'database' },
    },
    ...overrides,
  }
}

const onClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

describe('EventDetailPanel', () => {
  describe('integrity status', () => {
    it('shows VERIFIED status', () => {
      render(<EventDetailPanel event={makeEvent({ integrityStatus: 'VERIFIED' })} onClose={onClose} />)
      expect(screen.getByText('Datos íntegros')).toBeInTheDocument()
    })

    it('shows DISCREPANCY status', () => {
      render(<EventDetailPanel event={makeEvent({ integrityStatus: 'DISCREPANCY' })} onClose={onClose} />)
      expect(screen.getByText('Discrepancia')).toBeInTheDocument()
    })

    it('shows discrepancy analysis when DISCREPANCY', () => {
      render(<EventDetailPanel event={makeEvent({ integrityStatus: 'DISCREPANCY' })} onClose={onClose} />)
      expect(screen.getByText('Análisis de Discrepancia')).toBeInTheDocument()
    })

    it('does not show discrepancy analysis when VERIFIED', () => {
      render(<EventDetailPanel event={makeEvent({ integrityStatus: 'VERIFIED' })} onClose={onClose} />)
      expect(screen.queryByText('Análisis de Discrepancia')).not.toBeInTheDocument()
    })
  })

  describe('signature verification', () => {
    it('shows Firma válida when signatureValid is true', () => {
      render(<EventDetailPanel event={makeEvent({ signatureValid: true })} onClose={onClose} />)
      expect(screen.getByText('Firma válida')).toBeInTheDocument()
    })

    it('shows Firma inválida when signatureValid is false', () => {
      render(<EventDetailPanel event={makeEvent({ signatureValid: false })} onClose={onClose} />)
      expect(screen.getByText('Firma inválida')).toBeInTheDocument()
    })

    it('shows Sin datos when signatureValid is undefined', () => {
      const event = makeEvent({ signatureValid: undefined })
      render(<EventDetailPanel event={event} onClose={onClose} />)
      expect(screen.getByText('Sin datos')).toBeInTheDocument()
    })

    it('hides signature section when no signature and publicKey', () => {
      const event = makeEvent()
      event.details.blockchainRecord = { key: 'blockchain' }
      render(<EventDetailPanel event={event} onClose={onClose} />)
      expect(screen.queryByText('Verificación de Firma:')).not.toBeInTheDocument()
    })
  })

  describe('info modals', () => {
    function findInfoButtons(container: HTMLElement) {
      return Array.from(container.querySelectorAll('button')).filter(
        b => b.className.includes('rounded-full'),
      )
    }

    it('shows IntegrityInfoModal content when info button clicked', () => {
      const { container } = render(<EventDetailPanel event={makeEvent({ integrityStatus: 'VERIFIED' })} onClose={onClose} />)
      const infoBtns = findInfoButtons(container)
      const integrityBtn = infoBtns[1]
      fireEvent.click(integrityBtn)
      expect(screen.getByText('¿Cómo se verifica la integridad?')).toBeInTheDocument()
      expect(screen.getByText(/Relación de datos/)).toBeInTheDocument()
    })

    it('closes IntegrityInfoModal on toggle', () => {
      const { container } = render(<EventDetailPanel event={makeEvent({ integrityStatus: 'VERIFIED' })} onClose={onClose} />)
      const infoBtns = findInfoButtons(container)
      fireEvent.click(infoBtns[1])
      expect(screen.getByText('¿Cómo se verifica la integridad?')).toBeInTheDocument()
      fireEvent.click(infoBtns[1])
      expect(screen.queryByText('¿Cómo se verifica la integridad?')).not.toBeInTheDocument()
    })

    it('shows SignatureInfoModal content when info button clicked', () => {
      const { container } = render(<EventDetailPanel event={makeEvent({ signatureValid: true })} onClose={onClose} />)
      const infoBtns = findInfoButtons(container)
      const signatureBtn = infoBtns[0]
      fireEvent.click(signatureBtn)
      expect(screen.getByText('¿Cómo se verifica la firma?')).toBeInTheDocument()
      expect(screen.getByText(/Datos Firmados/)).toBeInTheDocument()
    })

    it('closes SignatureInfoModal on toggle', () => {
      const { container } = render(<EventDetailPanel event={makeEvent({ signatureValid: true })} onClose={onClose} />)
      const infoBtns = findInfoButtons(container)
      fireEvent.click(infoBtns[0])
      expect(screen.getByText('¿Cómo se verifica la firma?')).toBeInTheDocument()
      fireEvent.click(infoBtns[0])
      expect(screen.queryByText('¿Cómo se verifica la firma?')).not.toBeInTheDocument()
    })
  })

  describe('structure', () => {
    it('displays blockchain record title', () => {
      render(<EventDetailPanel event={makeEvent()} onClose={onClose} />)
      const viewers = screen.getAllByTestId('json-viewer')
      expect(viewers[0]).toHaveTextContent('Registro Blockchain (Inmutable)')
    })

    it('displays database record title', () => {
      render(<EventDetailPanel event={makeEvent()} onClose={onClose} />)
      const viewers = screen.getAllByTestId('json-viewer')
      expect(viewers[1]).toHaveTextContent('Estado Actual (Base de Datos)')
    })

    it('shows TX ID', () => {
      render(<EventDetailPanel event={makeEvent({ blockchainTxId: 'tx-001' })} onClose={onClose} />)
      expect(screen.getByText('tx-001')).toBeInTheDocument()
    })

    it('calls onClose when close button clicked', () => {
      render(<EventDetailPanel event={makeEvent()} onClose={onClose} />)
      const allButtons = screen.getAllByRole('button')
      const headerCloseBtn = allButtons.find(
        b => b.closest('div[class*="justify-between"]') !== null && b.querySelector('svg.lucide-x'),
      )
      expect(headerCloseBtn).toBeTruthy()
      if (headerCloseBtn) {
        fireEvent.click(headerCloseBtn)
        expect(onClose).toHaveBeenCalledTimes(1)
      }
    })
  })
})
