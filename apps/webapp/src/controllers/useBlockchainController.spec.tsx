import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as blockchainService from '../services/blockchain.service'
import { useBlockchainController } from './useBlockchainController'

jest.mock('../services/blockchain.service', () => ({
  getSmartContracts: jest.fn(),
  getNetworkNodes: jest.fn(),
  getOrganizations: jest.fn(),
  getNamespaces: jest.fn(),
  getRecentBlocks: jest.fn(),
  getBlockchainEvents: jest.fn(),
  getLedgerInfo: jest.fn(),
  getBlockchainManagerStatus: jest.fn(),
  getChannels: jest.fn(),
  getContractVersions: jest.fn(),
  deploySmartContract: jest.fn(),
}))

const mocked = blockchainService as jest.Mocked<typeof blockchainService>

const mockContract = { id: 'c1', name: 'C1', version: '1.0', channel: 'ch1', status: 'active' as const, createdAt: '2025-01-01' }
const mockNode = { id: 'n1', name: 'Node1', organization: 'Org1', status: 'active' }
const mockOrg = { id: 'o1', name: 'Org1' }
const mockNs = { name: 'ns1', type: 'default' }
const mockBlock = { blockNumber: 1, blockHash: 'h1', previousBlockHash: 'p', dataHash: 'd', transactionCount: 0, createdAt: '2025-01-01', transactions: [] }
const mockEvent = { id: 'e1', name: 'Evt1', protocolId: 'p1', source: 's1', timestamp: '2025-01-01', namespace: 'default' }
const mockVersion = { c1: '2.0' }

function TestComponent({ enabled = true }: { enabled?: boolean }) {
  const ctrl = useBlockchainController(enabled)
  return (
    <div>
      <span data-testid="loading">{String(ctrl.isLoading)}</span>
      <span data-testid="error">{ctrl.error ?? ''}</span>
      <span data-testid="contracts">{ctrl.smartContracts.length}</span>
      <span data-testid="nodes">{ctrl.networkNodes.length}</span>
      <span data-testid="orgs">{ctrl.organizations.length}</span>
      <span data-testid="namespaces">{ctrl.namespaces.length}</span>
      <span data-testid="blocks">{ctrl.blocks.length}</span>
      <span data-testid="events">{ctrl.events.length}</span>
      <span data-testid="height">{ctrl.ledgerHeight}</span>
      <span data-testid="status">{ctrl.managerStatus}</span>
      <span data-testid="deployLoading">{String(ctrl.deployLoading)}</span>
      <span data-testid="deploySuccess">{String(ctrl.deploySuccess)}</span>
      <button type="button" onClick={ctrl.refreshNetworkData}>Refresh</button>
      <button type="button" onClick={async () => { await ctrl.fetchNamespaceChannels('ns1') }}>FetchChannels</button>
      <button type="button" onClick={async () => {
        try {
          await ctrl.deploySmartContract({ name: 'Test', version: '1.0', channel: 'ch1', package: new File([''], 'pkg') })
        } catch { /* expected */ }
      }}>Deploy</button>
    </div>
  )
}

describe('useBlockchainController', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mocked.getSmartContracts.mockResolvedValue([mockContract])
    mocked.getContractVersions.mockResolvedValue(mockVersion)
    mocked.getNetworkNodes.mockResolvedValue([mockNode])
    mocked.getOrganizations.mockResolvedValue([mockOrg])
    mocked.getNamespaces.mockResolvedValue([mockNs])
    mocked.getRecentBlocks.mockResolvedValue([mockBlock])
    mocked.getBlockchainEvents.mockResolvedValue([mockEvent])
    mocked.getLedgerInfo.mockResolvedValue({ height: 42, lastBlockTime: '2025-01-01' })
    mocked.getBlockchainManagerStatus.mockResolvedValue('Online')
  })

  it('loads blockchain data on mount', async () => {
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('contracts')).toHaveTextContent('1')
    expect(screen.getByTestId('nodes')).toHaveTextContent('1')
    expect(screen.getByTestId('orgs')).toHaveTextContent('1')
    expect(screen.getByTestId('namespaces')).toHaveTextContent('1')
    expect(screen.getByTestId('blocks')).toHaveTextContent('1')
    expect(screen.getByTestId('events')).toHaveTextContent('1')
    expect(screen.getByTestId('height')).toHaveTextContent('42')
    expect(screen.getByTestId('status')).toHaveTextContent('Online')
    expect(screen.getByTestId('error')).toHaveTextContent('')
  })

  it('sets error when some data fails and uses fallbacks', async () => {
    mocked.getSmartContracts.mockRejectedValue(new Error('fail'))
    mocked.getNetworkNodes.mockRejectedValue(new Error('fail'))
    mocked.getOrganizations.mockRejectedValue(new Error('fail'))
    mocked.getNamespaces.mockRejectedValue(new Error('fail'))
    mocked.getRecentBlocks.mockRejectedValue(new Error('fail'))
    mocked.getBlockchainEvents.mockRejectedValue(new Error('fail'))
    mocked.getLedgerInfo.mockRejectedValue(new Error('fail'))
    mocked.getBlockchainManagerStatus.mockRejectedValue(new Error('fail'))
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('error')).toHaveTextContent('No se ha podido cargar completamente')
    expect(screen.getByTestId('contracts')).toHaveTextContent('0')
    expect(screen.getByTestId('height')).toHaveTextContent('0')
    expect(screen.getByTestId('status')).toHaveTextContent('Offline')
  })

  it('does not fetch when disabled', async () => {
    render(<TestComponent enabled={false} />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(mocked.getSmartContracts).not.toHaveBeenCalled()
    expect(screen.getByTestId('contracts')).toHaveTextContent('0')
  })

  it('fetches namespace channels', async () => {
    mocked.getChannels.mockResolvedValue([{ name: 'ch1' }])
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /fetchchannels/i }))
    await waitFor(() => expect(mocked.getChannels).toHaveBeenCalledTimes(1))
    expect(mocked.getChannels).toHaveBeenCalledWith('ns1')
  })

  it('deploys smart contract', async () => {
    mocked.deploySmartContract.mockResolvedValueOnce({ id: 'new-contract' })
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /deploy/i }))
    await waitFor(() => expect(screen.getByTestId('deploySuccess')).toHaveTextContent('true'))
    expect(screen.getByTestId('deployLoading')).toHaveTextContent('false')
  })

  it('handles deploy error', async () => {
    mocked.deploySmartContract.mockRejectedValueOnce({ response: { data: { message: 'Deploy failed' } } })
    render(<TestComponent />)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    fireEvent.click(screen.getByRole('button', { name: /deploy/i }))
    await waitFor(() => expect(screen.getByTestId('deployLoading')).toHaveTextContent('false'))
    expect(screen.getByTestId('deploySuccess')).toHaveTextContent('false')
  })
})
