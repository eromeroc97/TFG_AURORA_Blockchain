import { apiClient } from '../api/axios'

export interface AuditAnchor {
  timestamp: string
  type: string
  ingestId: string
  ecosystemId: string
  telemetryHash: string
  txId: string
  blockNumber: number
}

export interface AuditTimelineResponse {
  timeline: AuditAnchor[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export interface BlockchainStats {
  totalAnchors: number
  successRate: number
  totalBlocks: number
  totalTransactions: number
  avgAnchorsPerBlock: number
  activeEcosystems: number
  lastBlockNumber: number
  lastBlockTime: string
}

export interface ChainVisualization {
  chain: {
    blockNumber: number
    blockHash: string
    parentHash: string
    timestamp: string
    transactionCount: number
    transactions: {
      txId: string
      type: string
      ingestId: string
    }[]
  }[]
  summary: {
    totalBlocks: number
    totalTransactions: number
    chainHealth: string
    latestBlockNumber: number
    latestBlockTime: string
  }
}

export interface AuditFilters {
  ecosystemId?: string
  start?: string
  end?: string
  limit?: number
  offset?: number
}

export async function getAuditTimeline(filters: AuditFilters): Promise<AuditTimelineResponse> {
  try {
    const response = await apiClient.get<AuditTimelineResponse>('/audit/timeline', {
      params: filters,
    })
    return response.data
  } catch {
    return { timeline: [], pagination: { total: 0, limit: 50, offset: 0 } }
  }
}

export async function getAuditStats(): Promise<BlockchainStats> {
  try {
    const response = await apiClient.get<BlockchainStats>('/audit/stats')
    return response.data
  } catch {
    return {
      totalAnchors: 0,
      successRate: 0,
      totalBlocks: 0,
      totalTransactions: 0,
      avgAnchorsPerBlock: 0,
      activeEcosystems: 0,
      lastBlockNumber: 0,
      lastBlockTime: '',
    }
  }
}

export async function getAuditByIngestId(ingestId: string): Promise<AuditAnchor | null> {
  try {
    const response = await apiClient.get<AuditAnchor>(`/audit/ingest/${ingestId}`)
    return response.data
  } catch {
    return null
  }
}

export async function getAuditByHash(hash: string): Promise<AuditAnchor[]> {
  try {
    const response = await apiClient.get<AuditAnchor[]>(`/audit/hash/${hash}`)
    return response.data
  } catch {
    return []
  }
}

export async function getAuditByEcosystem(
  ecosystemId: string,
  startTime?: string,
  endTime?: string,
): Promise<AuditAnchor[]> {
  try {
    const response = await apiClient.get<AuditAnchor[]>(`/audit/ecosystem/${ecosystemId}`, {
      params: { startTime, endTime },
    })
    return response.data
  } catch {
    return []
  }
}

export async function getChainVisualization(
  startBlock?: number,
  endBlock?: number,
  limit: number = 50,
): Promise<ChainVisualization> {
  try {
    const response = await apiClient.get<ChainVisualization>('/audit/chain/visual', {
      params: { startBlock, endBlock, limit },
    })
    return response.data
  } catch {
    return {
      chain: [],
      summary: {
        totalBlocks: 0,
        totalTransactions: 0,
        chainHealth: 'unknown',
        latestBlockNumber: 0,
        latestBlockTime: '',
      },
    }
  }
}

export async function getBlockDetails(blockNumber: number): Promise<any> {
  try {
    const response = await apiClient.get(`/audit/block/${blockNumber}`)
    return response.data
  } catch {
    return null
  }
}