export interface AuditEvent {
  eventId: string;
  timestamp: string;
  action: string;
  actorName: string;
  type: 'TELEMETRY' | 'ADMINISTRATIVE' | 'FIREFLY';
  integrityStatus: 'VERIFIED' | 'DISCREPANCY';
  blockchainTxId: string;
  signatureValid?: boolean;
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
  type: 'TELEMETRY' | 'ADMINISTRATIVE' | 'FIREFLY';
  integrityStatus: 'VERIFIED' | 'DISCREPANCY';
  blockchainTxId: string;
  blockNumber?: number;
  telemetryHash?: string;
  ecosystemId?: string;
  ingestId?: string;
  output?: Record<string, unknown>;
  signatureValid?: boolean;
  dbRecord?: Record<string, unknown>;
}