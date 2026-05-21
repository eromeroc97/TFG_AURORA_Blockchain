import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RegisterChaincodeModal from './RegisterChaincodeModal'
import type { SmartContract } from '../../services/blockchain.service'

const mockRegisterChaincode = jest.fn()
jest.mock('../../services/blockchain.service', () => ({
  registerChaincode: (...args: unknown[]) => mockRegisterChaincode(...args),
}))

jest.mock('./GoDragDropZone', () => ({
  __esModule: true,
  default: ({ onJsonGenerated }: { onJsonGenerated: (json: string) => void }) => (
    <div data-testid="mock-drag-drop">
      <button onClick={() => onJsonGenerated('{"ffi": true}')}>Generate FFI</button>
    </div>
  ),
}))

const onClose = jest.fn()
const onSuccess = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

const fillForm = (isUpgrade = false) => {
  if (!isUpgrade) {
    fireEvent.change(screen.getByPlaceholderText(/ej\. aurora-telemetry-api/), { target: { value: 'test-api' } })
    const inputs = screen.getAllByPlaceholderText(/ej\./)
    const channelInput = inputs.find(i => (i as HTMLInputElement).placeholder.includes('firefly'))
    const ccInput = inputs.find(i => (i as HTMLInputElement).placeholder.includes('aurora-telemetry-anchor'))
    if (channelInput) fireEvent.change(channelInput, { target: { value: 'test-channel' } })
    if (ccInput) fireEvent.change(ccInput, { target: { value: 'test-cc' } })
  }
  fireEvent.change(screen.getByPlaceholderText(/{"name"/), { target: { value: '{"valid": true}' } })
}

describe('RegisterChaincodeModal', () => {
  describe('visibility', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(
        <RegisterChaincodeModal isOpen={false} onClose={onClose} />,
      )
      expect(container.innerHTML).toBe('')
    })

    it('renders when isOpen is true', () => {
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} />)
      expect(screen.getByText('Registrar Smart Contract')).toBeInTheDocument()
    })
  })

  describe('form fields', () => {
    it('renders all form fields', () => {
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} />)
      expect(screen.getByText('Nombre de la API Lógica')).toBeInTheDocument()
      expect(screen.getByText('Nombre del Canal de Fabric')).toBeInTheDocument()
      expect(screen.getByText('Nombre del Chaincode Físico')).toBeInTheDocument()
      expect(screen.getByText('Nombre del Evento')).toBeInTheDocument()
      expect(screen.getByText('Topic')).toBeInTheDocument()
      expect(screen.getByText('JSON de la Interfaz (FFI)')).toBeInTheDocument()
      expect(screen.getByTestId('mock-drag-drop')).toBeInTheDocument()
    })

    it('fills optional event name and topic fields', () => {
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} />)
      const eventInput = screen.getByPlaceholderText(/ActionAnchored/)
      const topicInput = screen.getByPlaceholderText(/auditoria-iot/)
      fireEvent.change(eventInput, { target: { value: 'TestEvent' } })
      fireEvent.change(topicInput, { target: { value: 'test-topic' } })
      expect((eventInput as HTMLInputElement).value).toBe('TestEvent')
      expect((topicInput as HTMLInputElement).value).toBe('test-topic')
    })

    it('populates FFI JSON via GoDragDropZone mock', () => {
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} />)
      fireEvent.click(screen.getByText('Generate FFI'))
      const textarea = screen.getByPlaceholderText(/{"name"/) as HTMLTextAreaElement
      expect(textarea.value).toBe('{"ffi": true}')
    })
  })

  describe('form submission', () => {
    it('calls registerChaincode on submit', async () => {
      mockRegisterChaincode.mockResolvedValue(undefined)
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />)
      fillForm()
      fireEvent.click(screen.getByText('Registrar'))
      await waitFor(() => {
        expect(mockRegisterChaincode).toHaveBeenCalledWith({
          apiName: 'test-api',
          channel: 'test-channel',
          chaincodeName: 'test-cc',
          ffiJson: '{"valid": true}',
          eventName: undefined,
          topic: undefined,
        })
      })
    })

    it('shows loading state during submission', async () => {
      mockRegisterChaincode.mockReturnValue(new Promise(() => {}))
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} />)
      fillForm()
      fireEvent.click(screen.getByText('Registrar'))
      expect(screen.getByText('Registrando...')).toBeInTheDocument()
    })

    it('shows success message and calls onSuccess', async () => {
      jest.useFakeTimers()
      mockRegisterChaincode.mockResolvedValue(undefined)
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />)
      fillForm()
      fireEvent.click(screen.getByText('Registrar'))
      await waitFor(() => {
        expect(screen.getByText('Chaincode registrado correctamente')).toBeInTheDocument()
      })
      expect(onSuccess).toHaveBeenCalled()
      jest.advanceTimersByTime(1500)
      expect(onClose).toHaveBeenCalled()
      jest.useRealTimers()
    })

    it('shows error message on failure', async () => {
      mockRegisterChaincode.mockRejectedValue(new Error('Custom error message'))
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} />)
      fillForm()
      fireEvent.click(screen.getByText('Registrar'))
      await waitFor(() => {
        expect(screen.getByText('Custom error message')).toBeInTheDocument()
      })
    })

    it('shows generic error message for non-Error rejections', async () => {
      mockRegisterChaincode.mockRejectedValue('string error')
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} />)
      fillForm()
      fireEvent.click(screen.getByText('Registrar'))
      await waitFor(() => {
        expect(screen.getByText('Error al procesar el chaincode')).toBeInTheDocument()
      })
    })
  })

  describe('upgrade mode', () => {
    const initialContract: SmartContract = {
      id: 'sc-1',
      name: 'existing-api',
      version: '1.0',
      channel: 'existing-channel',
      status: 'active',
      createdAt: '2024-01-01',
    }

    it('shows upgrade header and locked fields', () => {
      render(
        <RegisterChaincodeModal
          isOpen={true}
          onClose={onClose}
          initialContract={initialContract}
        />,
      )
      expect(screen.getByText('Actualizar Smart Contract')).toBeInTheDocument()
      expect(screen.getByText('Actualizando existing-api')).toBeInTheDocument()
      expect(screen.getByText('existing-channel')).toBeInTheDocument()
    })

    it('shows upgrade warning banner', () => {
      render(
        <RegisterChaincodeModal
          isOpen={true}
          onClose={onClose}
          initialContract={initialContract}
        />,
      )
      expect(
        screen.getByText(/Se registrará una nueva versión de la interfaz/),
      ).toBeInTheDocument()
    })

    it('shows upgrade success message', async () => {
      mockRegisterChaincode.mockResolvedValue(undefined)
      render(
        <RegisterChaincodeModal
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
          initialContract={initialContract}
        />,
      )
      fillForm(true)
      fireEvent.click(screen.getByText('Actualizar'))
      await waitFor(() => {
        expect(screen.getByText('Smart Contract actualizado correctamente')).toBeInTheDocument()
      })
    })

    it('shows loading with upgrade text', async () => {
      mockRegisterChaincode.mockReturnValue(new Promise(() => {}))
      render(
        <RegisterChaincodeModal
          isOpen={true}
          onClose={onClose}
          initialContract={initialContract}
        />,
      )
      fillForm(true)
      fireEvent.click(screen.getByText('Actualizar'))
      expect(screen.getByText('Actualizando...')).toBeInTheDocument()
    })
  })

  describe('close behavior', () => {
    it('calls onClose when X button clicked', () => {
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} />)
      const xButtons = screen.getAllByRole('button')
      const closeButton = xButtons.find(
        b => b.querySelector('svg.lucide-x'),
      )
      if (closeButton) fireEvent.click(closeButton)
      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when Cancel clicked', () => {
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} />)
      fireEvent.click(screen.getByText('Cancelar'))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('form validation', () => {
    it('submit button is disabled when form is invalid', () => {
      render(<RegisterChaincodeModal isOpen={true} onClose={onClose} />)
      const submitBtn = screen.getByRole('button', { name: /Registrar/i })
      expect(submitBtn).toBeDisabled()
    })
  })
})
