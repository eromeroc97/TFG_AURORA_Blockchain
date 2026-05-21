import * as auditService from './audit.service'

const mockGet = jest.fn()

jest.mock('../api/axios', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
  },
}))

describe('audit.service', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getAuditTimeline', () => {
    it('returns timeline on success', async () => {
      const data = { timeline: [{ eventId: '1' }], pagination: { total: 1, limit: 50, offset: 0 } }
      mockGet.mockResolvedValue({ data })
      const result = await auditService.getAuditTimeline({ limit: 10, offset: 0 })
      expect(result).toEqual(data)
      expect(mockGet).toHaveBeenCalledWith('/audit/timeline', {
        params: expect.objectContaining({ limit: 10, offset: 0 }),
      })
    })

    it('returns empty timeline on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await auditService.getAuditTimeline({})
      expect(result).toEqual({ timeline: [], pagination: { total: 0, limit: 50, offset: 0 } })
    })

    it('passes filters as params', async () => {
      mockGet.mockResolvedValue({ data: { timeline: [], pagination: { total: 0, limit: 50, offset: 0 } } })
      await auditService.getAuditTimeline({ ecosystemId: 'eco-1', eventType: 'TELEMETRY', startDate: '2025-01-01', endDate: '2025-01-31' })
      expect(mockGet).toHaveBeenCalledWith('/audit/timeline', {
        params: expect.objectContaining({
          ecosystemId: 'eco-1',
          eventType: 'TELEMETRY',
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        }),
      })
    })
  })

  describe('getAuditStats', () => {
    it('returns stats on success', async () => {
      const stats = { totalAnchors: 10, successRate: 95, totalBlocks: 5, totalTransactions: 20, avgAnchorsPerBlock: 2, activeEcosystems: 3, lastBlockNumber: 100, lastBlockTime: '2025-01-01T00:00:00Z' }
      mockGet.mockResolvedValue({ data: stats })
      const result = await auditService.getAuditStats()
      expect(result).toEqual(stats)
    })

    it('returns default stats on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await auditService.getAuditStats()
      expect(result).toEqual({
        totalAnchors: 0, successRate: 0, totalBlocks: 0, totalTransactions: 0,
        avgAnchorsPerBlock: 0, activeEcosystems: 0, lastBlockNumber: 0, lastBlockTime: '',
      })
    })
  })

  describe('getAuditByIngestId', () => {
    it('returns anchor on success', async () => {
      const anchor = { eventId: '1', timestamp: '2025-01-01', action: 'test', actorName: 'sys', type: 'TELEMETRY', integrityStatus: 'VERIFIED', blockchainTxId: '0xabc' }
      mockGet.mockResolvedValue({ data: anchor })
      const result = await auditService.getAuditByIngestId('ingest-1')
      expect(result).toEqual(anchor)
      expect(mockGet).toHaveBeenCalledWith('/audit/ingest/ingest-1')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await auditService.getAuditByIngestId('ingest-1')
      expect(result).toBeNull()
    })
  })

  describe('getAuditByHash', () => {
    it('returns anchors on success', async () => {
      const anchors = [{ eventId: '1', timestamp: '2025-01-01', action: 'test', actorName: 'sys', type: 'TELEMETRY', integrityStatus: 'VERIFIED', blockchainTxId: '0xabc' }]
      mockGet.mockResolvedValue({ data: anchors })
      const result = await auditService.getAuditByHash('hash-1')
      expect(result).toEqual(anchors)
      expect(mockGet).toHaveBeenCalledWith('/audit/hash/hash-1')
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await auditService.getAuditByHash('hash-1')
      expect(result).toEqual([])
    })
  })

  describe('getAuditByEcosystem', () => {
    it('returns anchors on success', async () => {
      const anchors = [{ eventId: '1', timestamp: '2025-01-01', action: 'test', actorName: 'sys', type: 'TELEMETRY', integrityStatus: 'VERIFIED', blockchainTxId: '0xabc' }]
      mockGet.mockResolvedValue({ data: anchors })
      const result = await auditService.getAuditByEcosystem('eco-1', '2025-01-01', '2025-01-31')
      expect(result).toEqual(anchors)
      expect(mockGet).toHaveBeenCalledWith('/audit/ecosystem/eco-1', {
        params: { startTime: '2025-01-01', endTime: '2025-01-31' },
      })
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await auditService.getAuditByEcosystem('eco-1')
      expect(result).toEqual([])
    })
  })

  describe('getChainVisualization', () => {
    it('returns visualization on success', async () => {
      const vis = { chain: [], summary: { totalBlocks: 0, totalTransactions: 0, chainHealth: 'healthy', latestBlockNumber: 0, latestBlockTime: '' } }
      mockGet.mockResolvedValue({ data: vis })
      const result = await auditService.getChainVisualization(0, 100, 20)
      expect(result).toEqual(vis)
      expect(mockGet).toHaveBeenCalledWith('/audit/chain/visual', {
        params: { startBlock: 0, endBlock: 100, limit: 20 },
      })
    })

    it('returns default on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await auditService.getChainVisualization()
      expect(result).toEqual({
        chain: [],
        summary: { totalBlocks: 0, totalTransactions: 0, chainHealth: 'unknown', latestBlockNumber: 0, latestBlockTime: '' },
      })
    })
  })

  describe('getBlockDetails', () => {
    it('returns block details on success', async () => {
      const details = { hash: '0xabc', number: 42 }
      mockGet.mockResolvedValue({ data: details })
      const result = await auditService.getBlockDetails(42)
      expect(result).toEqual(details)
      expect(mockGet).toHaveBeenCalledWith('/audit/block/42')
    })

    it('returns null on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))
      const result = await auditService.getBlockDetails(42)
      expect(result).toBeNull()
    })
  })
})
