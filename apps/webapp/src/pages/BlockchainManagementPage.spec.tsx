import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import BlockchainManagementPage from './BlockchainManagementPage'

const mockController = {
  smartContracts: [],
  contractVersions: {},
  networkNodes: [],
  organizations: [],
  namespaces: [],
  blocks: [],
  events: [],
  ledgerHeight: 0,
  ledgerLastBlockTime: '',
  managerStatus: 'Online' as const,
  namespaceChannels: {},
  fetchNamespaceChannels: jest.fn(),
  isLoading: false,
  error: null,
  deployLoading: false,
  deploySuccess: false,
  refreshNetworkData: jest.fn(),
  deploySmartContract: jest.fn(),
}

const mockGetContractInterface = jest.fn()
const mockDeleteChaincode = jest.fn()

jest.mock('../controllers/useBlockchainController', () => ({
  useBlockchainController: () => mockController,
}))

const mockUseAuth = jest.fn<{ authClaims: { sub: string; email: string; role: string } }, []>()
jest.mock('../context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}))
mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'GLOBAL_ADMIN' } })

jest.mock('../components/blockchain/BlockchainTopologyGraph', () => ({
  __esModule: true,
  default: () => <div data-testid="topology-graph" />,
}))

jest.mock('../components/blockchain/RegisterChaincodeModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess?: () => void }) =>
    isOpen ? (
      <div data-testid="register-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => onSuccess?.()}>Trigger Success</button>
      </div>
    ) : null,
}))

jest.mock('../components/blockchain/DeploymentHelpModal', () => ({
  __esModule: true,
  default: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="deployment-help" data-disabled={disabled} />
  ),
}))

jest.mock('../components/Select', () => ({
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
}))

jest.mock('../services/blockchain.service', () => ({
  getContractInterface: (...args: unknown[]) => mockGetContractInterface(...args),
  deleteChaincode: (...args: unknown[]) => mockDeleteChaincode(...args),
}))

function mockEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    name: 'Test Event',
    protocolId: 'proto-1',
    source: 'fabric',
    timestamp: new Date().toISOString(),
    tx: { blockchainId: 'tx-abc-def', type: 'fabric', id: 'tx-1' },
    output: { key: 'value' },
    listener: 'listener-1',
    namespace: 'default',
    ...overrides,
  }
}

function mockContract(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sc-1',
    name: 'test-contract',
    version: '1.0',
    channel: 'default',
    status: 'active' as const,
    createdAt: '2024-01-15T10:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'admin@test.com', role: 'GLOBAL_ADMIN' } })
  Object.assign(mockController, {
    smartContracts: [],
    contractVersions: {},
    networkNodes: [],
    organizations: [],
    namespaces: [],
    events: [],
    isLoading: false,
    error: null,
    managerStatus: 'Online',
  })
})

function setAuthRole(role: string) {
  mockUseAuth.mockReturnValue({ authClaims: { sub: 'u1', email: 'u@t.com', role } })
}

describe('BlockchainManagementPage', () => {
  describe('loading state', () => {
    it('shows loading indicators when isLoading is true', () => {
      mockController.isLoading = true
      render(<BlockchainManagementPage />)
      const loadingTexts = screen.getAllByText('...')
      expect(loadingTexts.length).toBeGreaterThanOrEqual(4)
      expect(screen.queryByTestId('topology-graph')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error in topology section', () => {
      mockController.error = 'Network error'
      render(<BlockchainManagementPage />)
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.queryByTestId('topology-graph')).not.toBeInTheDocument()
    })
  })

  describe('dashboard cards', () => {
    it('renders dashboard with data', () => {
      mockController.organizations = [{ id: 'org-1', name: 'Org1' }]
      mockController.namespaces = [{ name: 'default', type: 'fabric' }]
      mockController.events = [mockEvent()]
      mockController.networkNodes = [{ id: 'n1', name: 'Node1', organization: 'Org1', status: 'active' }]
      render(<BlockchainManagementPage />)
      expect(screen.getByText('Online')).toBeInTheDocument()
      expect(screen.getByText('Activo')).toBeInTheDocument()
      expect(screen.getAllByText('1').length).toBe(3)
    })
  })

  describe('events table', () => {
    it('shows empty state when no events', () => {
      render(<BlockchainManagementPage />)
      expect(screen.getByText('No hay eventos en el ledger')).toBeInTheDocument()
    })

    it('renders events with pagination', () => {
      mockController.events = Array.from({ length: 15 }, (_, i) => mockEvent({ id: `evt-${i}`, name: `Event ${i}` }))
      render(<BlockchainManagementPage />)
      expect(screen.getByText('Event 0')).toBeInTheDocument()
      expect(screen.getByText('Event 9')).toBeInTheDocument()
      expect(screen.queryByText('Event 10')).not.toBeInTheDocument()
      expect(screen.getAllByText(/Página 1 de 2/).length).toBeGreaterThanOrEqual(1)
    })

    it('paginates events', () => {
      mockController.events = Array.from({ length: 15 }, (_, i) => mockEvent({ id: `evt-${i}`, name: `Event ${i}` }))
      render(<BlockchainManagementPage />)
      const chevrons = document.querySelectorAll('.lucide-chevron-right')
      const nextBtn = chevrons[0]?.closest('button')
      if (nextBtn) fireEvent.click(nextBtn)
      expect(screen.getByText('Event 10')).toBeInTheDocument()
      expect(screen.queryByText('Event 0')).not.toBeInTheDocument()
    })

    it('searches events', () => {
      mockController.events = [
        mockEvent({ id: 'evt-1', name: 'Alpha' }),
        mockEvent({ id: 'evt-2', name: 'Beta' }),
      ]
      render(<BlockchainManagementPage />)
      fireEvent.change(screen.getByPlaceholderText('Buscar eventos...'), { target: { value: 'Alpha' } })
      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    })

    it('toggles events filter panel', () => {
      render(<BlockchainManagementPage />)
      expect(screen.queryByText('Namespace')).not.toBeInTheDocument()
      const filterBtns = screen.getAllByText('Filtros')
      fireEvent.click(filterBtns[0])
      expect(screen.getByText('Namespace')).toBeInTheDocument()
    })

    it('clears events filters', () => {
      mockController.events = [
        mockEvent({ id: 'evt-1', name: 'Alpha', namespace: 'ns1' }),
        mockEvent({ id: 'evt-2', name: 'Beta', namespace: 'ns2' }),
      ]
      mockController.namespaces = [{ name: 'ns1', type: 'fabric' }, { name: 'ns2', type: 'fabric' }]
      render(<BlockchainManagementPage />)
      const filterBtn = screen.getAllByText('Filtros')[0]
      fireEvent.click(filterBtn)
      const comboboxes = screen.getAllByRole('combobox')
      const nsSelect = comboboxes[1] as HTMLSelectElement
      fireEvent.change(nsSelect, { target: { value: 'ns1' } })
      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.queryByText('Beta')).not.toBeInTheDocument()
      fireEvent.click(screen.getByText('Limpiar'))
      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.getByText('Beta')).toBeInTheDocument()
    })
  })

  describe('smart contracts section', () => {
    it('shows empty state when no contracts', () => {
      render(<BlockchainManagementPage />)
      expect(screen.getByText('No hay smart contracts para los filtros seleccionados')).toBeInTheDocument()
    })

    it('renders contracts with pagination', () => {
      mockController.smartContracts = Array.from({ length: 25 }, (_, i) => mockContract({ id: `sc-${i}`, name: `Contract ${i}` }))
      render(<BlockchainManagementPage />)
      expect(screen.getByText('Contract 0')).toBeInTheDocument()
      expect(screen.getByText('Contract 9')).toBeInTheDocument()
      expect(screen.queryByText('Contract 10')).not.toBeInTheDocument()
    })

    it('paginates contracts', () => {
      mockController.smartContracts = Array.from({ length: 25 }, (_, i) => mockContract({ id: `sc-${i}`, name: `Contract ${i}` }))
      render(<BlockchainManagementPage />)
      const chevrons = document.querySelectorAll('.lucide-chevron-right')
      const nextBtn = chevrons[chevrons.length - 1]?.closest('button')
      if (nextBtn) fireEvent.click(nextBtn)
      expect(screen.getByText('Contract 10')).toBeInTheDocument()
    })

    it('searches contracts by name', () => {
      mockController.smartContracts = [
        mockContract({ id: 'sc-1', name: 'alpha-contract' }),
        mockContract({ id: 'sc-2', name: 'beta-contract' }),
      ]
      render(<BlockchainManagementPage />)
      const searchInputs = screen.getAllByPlaceholderText(/Buscar/)
      const contractSearch = searchInputs.find(i => (i as HTMLInputElement).placeholder.includes('nombre'))
      if (contractSearch) fireEvent.change(contractSearch, { target: { value: 'alpha' } })
      expect(screen.getByText('alpha-contract')).toBeInTheDocument()
      expect(screen.queryByText('beta-contract')).not.toBeInTheDocument()
    })

    it('toggles contract filter panel', () => {
      render(<BlockchainManagementPage />)
      const filterBtns = screen.getAllByText('Filtros')
      fireEvent.click(filterBtns[filterBtns.length - 1])
      expect(screen.getByText('Estado')).toBeInTheDocument()
    })
  })

  describe('detail modals', () => {
    it('opens organizations modal', () => {
      mockController.organizations = [{ id: 'org-1', name: 'Org1', description: 'Test org' }]
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('Organizaciones'))
      expect(screen.getByText('Total: 1 organizaciones')).toBeInTheDocument()
      expect(screen.getByText('Org1')).toBeInTheDocument()
      expect(screen.getByText('Test org')).toBeInTheDocument()
    })

    it('opens namespaces modal', () => {
      mockController.namespaces = [{ name: 'ns1', type: 'fabric', description: 'Test NS' }]
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('Namespaces'))
      expect(screen.getByText('Total: 1 namespaces')).toBeInTheDocument()
      expect(screen.getByText('ns1')).toBeInTheDocument()
    })

    it('opens ledger modal with event counts', () => {
      mockController.events = [mockEvent(), mockEvent()]
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('Eventos'))
      expect(screen.getByText('Eventos totales')).toBeInTheDocument()
      expect(screen.getByText('Eventos última hora')).toBeInTheDocument()
    })

    it('closes detail modal on backdrop click', () => {
      mockController.organizations = [{ id: 'org-1', name: 'Org1' }]
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('Organizaciones'))
      expect(screen.getByText('Total: 1 organizaciones')).toBeInTheDocument()
      const backdrop = document.querySelector('.fixed.inset-0.z-50 div:first-child')
      if (backdrop) fireEvent.click(backdrop)
      expect(screen.queryByText('Total: 1 organizaciones')).not.toBeInTheDocument()
    })
  })

  describe('event detail modal', () => {
    it('opens event detail on row click', () => {
      mockController.events = [mockEvent({ name: 'Clickable Event' })]
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('Clickable Event'))
      expect(screen.getByText('Detalle del Evento')).toBeInTheDocument()
      expect(screen.getByText('proto-1')).toBeInTheDocument()
      expect(screen.getByText('tx-abc-def')).toBeInTheDocument()
    })

    it('shows listener and output sections', () => {
      mockController.events = [mockEvent()]
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('Test Event'))
      expect(screen.getByText('listener-1')).toBeInTheDocument()
      expect(screen.getByText(/"key"/)).toBeInTheDocument()
    })

    it('shows TX section when event has tx', () => {
      mockController.events = [mockEvent({ tx: { blockchainId: 'tx-xyz' } })]
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('Test Event'))
      expect(screen.getByText('tx-xyz')).toBeInTheDocument()
    })

    it('hides TX section when no tx', () => {
      mockController.events = [mockEvent({ tx: undefined })]
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('Test Event'))
      expect(screen.queryByText('Transacción')).not.toBeInTheDocument()
    })
  })

  describe('contract detail modal', () => {
    it('opens contract detail and loads interface', async () => {
      mockController.smartContracts = [mockContract({ name: 'my-contract' })]
      mockGetContractInterface.mockResolvedValue({ info: { version: '2.0' }, methods: [] })
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('my-contract'))
      await waitFor(() => {
        expect(screen.getByText('Detalle de Smart Contract')).toBeInTheDocument()
      })
      expect(screen.getAllByText('my-contract').length).toBeGreaterThanOrEqual(2)
    })

    it('shows loading spinner while fetching interface', async () => {
      mockController.smartContracts = [mockContract({ name: 'my-contract' })]
      mockGetContractInterface.mockReturnValue(new Promise(() => {}))
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('my-contract'))
      expect(screen.getByText('Detalle de Smart Contract')).toBeInTheDocument()
    })

    it('shows error when interface fetch fails', async () => {
      mockController.smartContracts = [mockContract({ name: 'my-contract' })]
      mockGetContractInterface.mockRejectedValue(new Error('fail'))
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('my-contract'))
      await waitFor(() => {
        expect(screen.getByText(/Error al obtener la interfaz/)).toBeInTheDocument()
      })
    })

    it('shows upgrade and delete buttons for GLOBAL_ADMIN', async () => {
      mockController.smartContracts = [mockContract({ name: 'my-contract' })]
      mockGetContractInterface.mockResolvedValue({ info: {}, methods: [] })
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('my-contract'))
      await waitFor(() => {
        expect(screen.getByText('Actualizar')).toBeInTheDocument()
      })
      expect(screen.getByText('Eliminar')).toBeInTheDocument()
    })

    it('hides upgrade/delete buttons for non-admin users', () => {
      setAuthRole('USER')
      mockController.smartContracts = [mockContract({ name: 'my-contract' })]
      mockGetContractInterface.mockResolvedValue({ info: {}, methods: [] })
      render(<BlockchainManagementPage />)
      expect(screen.queryByText('Registrar Smart Contract')).not.toBeInTheDocument()
    })
  })

  describe('register modal', () => {
    it('shows register button for GLOBAL_ADMIN', () => {
      render(<BlockchainManagementPage />)
      expect(screen.getByText('Registrar Smart Contract')).toBeInTheDocument()
    })

    it('opens register modal on button click', () => {
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('Registrar Smart Contract'))
      expect(screen.getAllByTestId('register-modal').length).toBeGreaterThan(0)
    })
  })

  describe('upgrade modal', () => {
    it('opens upgrade modal from contract detail', async () => {
      mockController.smartContracts = [mockContract({ name: 'my-contract' })]
      mockGetContractInterface.mockResolvedValue({ info: {}, methods: [] })
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('my-contract'))
      await waitFor(() => {
        expect(screen.getByText('Actualizar')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('Actualizar'))
      expect(screen.getAllByTestId('register-modal').length).toBeGreaterThan(0)
    })
  })

  describe('delete confirmation', () => {
    it('shows delete confirmation dialog', async () => {
      mockController.smartContracts = [mockContract({ name: 'to-delete' })]
      mockGetContractInterface.mockResolvedValue({ info: {}, methods: [] })
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('to-delete'))
      await waitFor(() => {
        expect(screen.getByText('Eliminar')).toBeInTheDocument()
      })
      const deleteBtns = screen.getAllByText('Eliminar')
      fireEvent.click(deleteBtns[deleteBtns.length - 1])
      expect(screen.getByText(/¿Estás seguro/)).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    it('cancels delete on Cancel click', async () => {
      mockController.smartContracts = [mockContract({ name: 'to-delete' })]
      mockGetContractInterface.mockResolvedValue({ info: {}, methods: [] })
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('to-delete'))
      await waitFor(() => { expect(screen.getByText('Eliminar')).toBeInTheDocument() })
      const deleteBtns = screen.getAllByText('Eliminar')
      fireEvent.click(deleteBtns[deleteBtns.length - 1])
      fireEvent.click(screen.getByText('Cancelar'))
      expect(screen.queryByText(/¿Estás seguro/)).not.toBeInTheDocument()
    })

    it('executes delete and refreshes', async () => {
      mockDeleteChaincode.mockResolvedValue(undefined)
      mockController.smartContracts = [mockContract({ name: 'to-delete' })]
      mockGetContractInterface.mockResolvedValue({ info: {}, methods: [] })
      render(<BlockchainManagementPage />)
      fireEvent.click(screen.getByText('to-delete'))
      await waitFor(() => { expect(screen.getByText('Eliminar')).toBeInTheDocument() })
      const deleteBtns = screen.getAllByText('Eliminar')
      fireEvent.click(deleteBtns[deleteBtns.length - 1])
      const allEliminar = screen.getAllByText('Eliminar')
      const confirmBtn = allEliminar[allEliminar.length - 1]
      fireEvent.click(confirmBtn)
      await waitFor(() => {
        expect(mockDeleteChaincode).toHaveBeenCalledWith('to-delete')
      })
      expect(mockController.refreshNetworkData).toHaveBeenCalled()
    })
  })

  describe('role-based access', () => {
    it('disables register button and DeploymentHelp for ADMIN role', () => {
      setAuthRole('ADMIN')
      render(<BlockchainManagementPage />)
      expect(screen.getByText('Registrar Smart Contract').closest('button')).toBeDisabled()
      expect(screen.getByTestId('deployment-help')).toHaveAttribute('data-disabled', 'true')
    })

    it('hides register button for USER role', () => {
      setAuthRole('USER')
      render(<BlockchainManagementPage />)
      expect(screen.queryByText('Registrar Smart Contract')).not.toBeInTheDocument()
      expect(screen.getByTestId('deployment-help')).toHaveAttribute('data-disabled', 'false')
    })
  })

  describe('event filtering', () => {
    it('filters events by search term matching id', () => {
      mockController.events = [
        mockEvent({ id: 'target-event', name: 'Other' }),
        mockEvent({ id: 'other', name: 'Something' }),
      ]
      render(<BlockchainManagementPage />)
      fireEvent.change(screen.getByPlaceholderText('Buscar eventos...'), { target: { value: 'target' } })
      expect(screen.getByText('Other')).toBeInTheDocument()
      expect(screen.queryByText('Something')).not.toBeInTheDocument()
    })

    it('filters events by source', () => {
      mockController.events = [
        mockEvent({ id: 'e1', name: 'A', source: 'fabric' }),
        mockEvent({ id: 'e2', name: 'B', source: 'other' }),
      ]
      render(<BlockchainManagementPage />)
      const filterBtns = screen.getAllByText('Filtros')
      fireEvent.click(filterBtns[0])
      const comboboxes = screen.getAllByRole('combobox')
      const sourceSelect = comboboxes[2]
      fireEvent.change(sourceSelect, { target: { value: 'fabric' } })
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('filters events by TX', () => {
      mockController.events = [
        mockEvent({ id: 'e1', name: 'With TX', tx: { blockchainId: 'abc123' } }),
        mockEvent({ id: 'e2', name: 'No Match', tx: { blockchainId: 'xyz999' } }),
      ]
      render(<BlockchainManagementPage />)
      const filterBtns = screen.getAllByText('Filtros')
      fireEvent.click(filterBtns[0])
      const txInput = screen.getByPlaceholderText('Buscar TX...')
      fireEvent.change(txInput, { target: { value: 'abc' } })
      expect(screen.getByText('With TX')).toBeInTheDocument()
      expect(screen.queryByText('No Match')).not.toBeInTheDocument()
    })

    it('filters events by date from', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-07-01'))
      mockController.events = [
        mockEvent({ id: 'e1', name: 'Old', timestamp: '2024-01-01T00:00:00Z' }),
        mockEvent({ id: 'e2', name: 'Recent', timestamp: '2024-06-15T00:00:00Z' }),
      ]
      render(<BlockchainManagementPage />)
      const filterBtns = screen.getAllByText('Filtros')
      fireEvent.click(filterBtns[0])
      const dateInputs = screen.getAllByDisplayValue('') as HTMLInputElement[]
      const fromInput = dateInputs.find(i => i.type === 'date')
      if (fromInput) fireEvent.change(fromInput, { target: { value: '2024-06-01' } })
      expect(screen.getByText('Recent')).toBeInTheDocument()
      expect(screen.queryByText('Old')).not.toBeInTheDocument()
      jest.useRealTimers()
    })

    it('filters events by date to', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-07-01'))
      mockController.events = [
        mockEvent({ id: 'e1', name: 'Old', timestamp: '2024-01-01T00:00:00Z' }),
        mockEvent({ id: 'e2', name: 'Recent', timestamp: '2024-06-15T00:00:00Z' }),
      ]
      render(<BlockchainManagementPage />)
      const filterBtns = screen.getAllByText('Filtros')
      fireEvent.click(filterBtns[0])
      const dateInputs = screen.getAllByDisplayValue('') as HTMLInputElement[]
      const dateInputsTyped = dateInputs.filter(i => i.type === 'date')
      const toInput = dateInputsTyped[1]
      if (toInput) fireEvent.change(toInput, { target: { value: '2024-03-01' } })
      expect(screen.getByText('Old')).toBeInTheDocument()
      expect(screen.queryByText('Recent')).not.toBeInTheDocument()
      jest.useRealTimers()
    })
  })

  describe('contract filtering', () => {
    it('filters contracts by status', () => {
      mockController.smartContracts = [
        mockContract({ id: 'sc-1', name: 'Active', status: 'active' }),
        mockContract({ id: 'sc-2', name: 'Failed', status: 'failed' }),
      ]
      render(<BlockchainManagementPage />)
      const filterBtns = screen.getAllByText('Filtros')
      fireEvent.click(filterBtns[filterBtns.length - 1])
      const comboboxes = screen.getAllByRole('combobox')
      const statusSelect = comboboxes[2] as HTMLSelectElement
      fireEvent.change(statusSelect, { target: { value: 'active' } })
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.queryByText('Failed')).not.toBeInTheDocument()
    })
  })

  describe('event tx display', () => {
    it('shows truncated TX id in table', () => {
      mockController.events = [mockEvent({ name: 'TX Event', tx: { blockchainId: 'abcdef1234567890' } })]
      render(<BlockchainManagementPage />)
      expect(screen.getByText('abcdef123456...')).toBeInTheDocument()
    })

    it('shows dash when no TX blockchainId', () => {
      mockController.events = [mockEvent({ name: 'No TX', tx: { blockchainId: undefined } })]
      render(<BlockchainManagementPage />)
      expect(screen.getByText('No TX')).toBeInTheDocument()
    })
  })
})
