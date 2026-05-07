export interface AuditEvent {
  eventId: string;
  timestamp: string;
  action: string;
  actorName: string;
  type: 'TELEMETRY' | 'ADMIN';
  integrityStatus: 'VERIFIED' | 'DISCREPANCY';
  blockchainTxId: string;
  details: {
    blockchainRecord: Record<string, unknown>;
    databaseRecord: Record<string, unknown>;
  };
}

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