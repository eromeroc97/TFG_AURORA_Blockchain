export interface AuditTimelineItem {
  eventId: string;
  timestamp: string;
  action: string;
  actorName: string;
  type: 'TELEMETRY' | 'ADMIN';
  integrityStatus: 'VERIFIED' | 'DISCREPANCY';
  blockchainTxId: string;
  blockNumber?: number;
  telemetryHash?: string;
  ecosystemId?: string;
  ingestId?: string;
}

export interface AuditTimelineResponse {
  timeline: AuditTimelineItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface BlockchainStats {
  totalAnchors: number;
  successRate: number;
  totalBlocks: number;
  totalTransactions: number;
  avgAnchorsPerBlock: number;
  activeEcosystems: number;
  lastBlockNumber: number;
  lastBlockTime: string;
  recentActivity?: { hour: string; count: number }[];
  statusDistribution?: { name: string; value: number }[];
}

export interface ChainBlock {
  blockNumber: number;
  blockHash: string;
  parentHash: string;
  timestamp: string;
  transactionCount: number;
  transactions: {
    txId: string;
    type: 'anchor';
    ingestId: string;
    ecosystemId: string;
  }[];
}

export interface ChainVisualization {
  chain: ChainBlock[];
  summary: {
    totalBlocks: number;
    totalTransactions: number;
    chainHealth: 'healthy' | 'degraded' | 'error';
    latestBlockNumber: number;
    latestBlockTime: string;
  };
}
