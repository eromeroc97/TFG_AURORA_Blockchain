import * as blockchainService from './blockchain.service'
import type { SmartContract } from './blockchain.service'

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockDelete = jest.fn()

jest.mock('../api/axios', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}))

describe('blockchain.service', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getChannels', () => {
    it('returns channels on success', async () => {
      mockGet.mockResolvedValue({ data: { items: [{ name: 'channel1' }] } })
      const result = await blockchainService.getChannels('ns1')
      expect(result).toEqual([{ name: 'channel1' }])
      expect(mockGet).toHaveBeenCalledWith('/blockchain/namespaces/ns1/channels', { params: { namespace: 'ns1' } })
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await blockchainService.getChannels('ns1')
      expect(result).toEqual([])
    })
  })

  describe('getSmartContracts', () => {
    it('returns contracts from array response', async () => {
      mockGet.mockResolvedValue({ data: [{ id: 'c1', name: 'Contract1', version: '1.0', channel: 'ch1', status: 'active', createdAt: '2025-01-01' }] })
      const result = await blockchainService.getSmartContracts()
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Contract1')
      expect(result[0].status).toBe('active')
    })

    it('returns contracts from items field', async () => {
      mockGet.mockResolvedValue({ data: { items: [{ name: 'C1', version: '1.0', channel: 'ch1', status: 'active', createdAt: '2025-01-01' }] } })
      const result = await blockchainService.getSmartContracts()
      expect(result).toHaveLength(1)
    })

    it('returns contracts from data field', async () => {
      mockGet.mockResolvedValue({ data: { data: [{ id: 'c1', name: 'C1' }] } })
      const result = await blockchainService.getSmartContracts()
      expect(result).toHaveLength(1)
    })

    it('returns empty array for unknown shape', async () => {
      mockGet.mockResolvedValue({ data: { foo: 'bar' } })
      const result = await blockchainService.getSmartContracts()
      expect(result).toEqual([])
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await blockchainService.getSmartContracts()
      expect(result).toEqual([])
    })
  })

  describe('deploySmartContract', () => {
    it('sends form data and returns id', async () => {
      const file = new File(['content'], 'package.tar.gz')
      mockPost.mockResolvedValue({ data: { id: 'new-contract' } })
      const result = await blockchainService.deploySmartContract({ name: 'Test', version: '1.0', channel: 'ch1', package: file })
      expect(result).toEqual({ id: 'new-contract' })
      expect(mockPost).toHaveBeenCalledWith('/blockchain/contracts/deploy', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    })
  })

  describe('getNetworkNodes', () => {
    it('returns nodes on success', async () => {
      mockGet.mockResolvedValue({ data: { items: [{ id: 'node-1', name: 'Node1', organization: 'Org1', status: 'active' }] } })
      const result = await blockchainService.getNetworkNodes()
      expect(result).toHaveLength(1)
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await blockchainService.getNetworkNodes()
      expect(result).toEqual([])
    })
  })

  describe('getOrganizations', () => {
    it('returns organizations on success', async () => {
      mockGet.mockResolvedValue({ data: { items: [{ id: 'org-1', name: 'Org1' }] } })
      const result = await blockchainService.getOrganizations()
      expect(result).toHaveLength(1)
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await blockchainService.getOrganizations()
      expect(result).toEqual([])
    })
  })

  describe('getNamespaces', () => {
    it('returns namespaces on success', async () => {
      mockGet.mockResolvedValue({ data: { items: [{ name: 'ns1', type: 'default' }] } })
      const result = await blockchainService.getNamespaces()
      expect(result).toHaveLength(1)
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await blockchainService.getNamespaces()
      expect(result).toEqual([])
    })
  })

  describe('getRecentBlocks', () => {
    it('returns blocks with default limit', async () => {
      mockGet.mockResolvedValue({ data: [{ blockNumber: 1, blockHash: 'hash1', previousBlockHash: 'prev', dataHash: 'data', transactionCount: 0, createdAt: '2025-01-01', transactions: [] }] })
      const result = await blockchainService.getRecentBlocks()
      expect(result).toHaveLength(1)
      expect(mockGet).toHaveBeenCalledWith('/blockchain/blocks', { params: { limit: 10 } })
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await blockchainService.getRecentBlocks()
      expect(result).toEqual([])
    })
  })

  describe('getBlockchainEvents', () => {
    it('returns events with default namespace', async () => {
      mockGet.mockResolvedValue({ data: { items: [{ id: 'evt-1', name: 'Event1', protocolId: 'p1', source: 's1', timestamp: '2025-01-01', namespace: 'default' }] } })
      const result = await blockchainService.getBlockchainEvents()
      expect(result).toHaveLength(1)
      expect(mockGet).toHaveBeenCalledWith('/blockchain/events', { params: { namespace: 'default' } })
    })

    it('passes limit when provided', async () => {
      mockGet.mockResolvedValue({ data: { items: [] } })
      await blockchainService.getBlockchainEvents('ns1', 5)
      expect(mockGet).toHaveBeenCalledWith('/blockchain/events', { params: { namespace: 'ns1', limit: 5 } })
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await blockchainService.getBlockchainEvents()
      expect(result).toEqual([])
    })
  })

  describe('getRecentTransactions', () => {
    it('returns transactions with default limit', async () => {
      mockGet.mockResolvedValue({ data: { items: [{ id: 'tx-1', type: 'invoke', createdAt: '2025-01-01', status: 'valid' }] } })
      const result = await blockchainService.getRecentTransactions()
      expect(result).toHaveLength(1)
      expect(mockGet).toHaveBeenCalledWith('/blockchain/transactions', { params: { limit: 20 } })
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await blockchainService.getRecentTransactions()
      expect(result).toEqual([])
    })
  })

  describe('getLedgerInfo', () => {
    it('returns ledger info on success', async () => {
      mockGet.mockResolvedValue({ data: { height: 42, lastBlockTime: '2025-01-01' } })
      const result = await blockchainService.getLedgerInfo()
      expect(result).toEqual({ height: 42, lastBlockTime: '2025-01-01' })
    })

    it('returns defaults on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await blockchainService.getLedgerInfo()
      expect(result).toEqual({ height: 0, lastBlockTime: '' })
    })
  })

  describe('getBlockchainManagerStatus', () => {
    it('returns Online when status is UP', async () => {
      mockGet.mockResolvedValue({ data: { status: 'UP' } })
      const result = await blockchainService.getBlockchainManagerStatus()
      expect(result).toBe('Online')
    })

    it('returns Offline when status is not UP', async () => {
      mockGet.mockResolvedValue({ data: { status: 'DOWN' } })
      const result = await blockchainService.getBlockchainManagerStatus()
      expect(result).toBe('Offline')
    })

    it('returns Offline on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await blockchainService.getBlockchainManagerStatus()
      expect(result).toBe('Offline')
    })
  })

  describe('registerChaincode', () => {
    it('registers chaincode and returns response', async () => {
      const response = { success: true, message: 'ok', ffiId: 'ffi-1' }
      mockPost.mockResolvedValue({ data: response })
      const result = await blockchainService.registerChaincode({ apiName: 'test', channel: 'ch1', chaincodeName: 'cc1', ffiJson: '{}' })
      expect(result).toEqual(response)
      expect(mockPost).toHaveBeenCalledWith('/blockchain/register-chaincode', { apiName: 'test', channel: 'ch1', chaincodeName: 'cc1', ffiJson: '{}' })
    })
  })

  describe('getContractInterface', () => {
    it('returns contract interface', async () => {
      const response = { name: 'TestContract', version: '1.0' }
      mockGet.mockResolvedValue({ data: response })
      const result = await blockchainService.getContractInterface('TestContract')
      expect(result).toEqual(response)
      expect(mockGet).toHaveBeenCalledWith('/blockchain/contracts/interface', { params: { name: 'TestContract' } })
    })
  })

  describe('getContractVersions', () => {
    it('returns versions map from contracts', async () => {
      const contracts = [{ id: 'c1', name: 'C1', version: '1.0', channel: 'ch1', status: 'active', createdAt: '2025-01-01' }] as SmartContract[]
      mockGet.mockResolvedValue({ data: { info: { version: '2.0' } } })
      const result = await blockchainService.getContractVersions(contracts)
      expect(result).toEqual({ c1: '2.0' })
    })

    it('handles missing info.version gracefully', async () => {
      const contracts = [{ id: 'c2', name: 'C2', version: '1.0', channel: 'ch1', status: 'active', createdAt: '2025-01-01' }] as SmartContract[]
      mockGet.mockResolvedValue({ data: {} })
      const result = await blockchainService.getContractVersions(contracts)
      expect(result).toEqual({})
    })
  })

  describe('deleteChaincode', () => {
    it('sends delete request', async () => {
      mockDelete.mockResolvedValue({})
      await blockchainService.deleteChaincode('test-api')
      expect(mockDelete).toHaveBeenCalledWith('/blockchain/chaincodes/test-api')
    })
  })
})
