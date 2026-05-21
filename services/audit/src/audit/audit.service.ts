import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { FireFlyService } from '../firefly/firefly.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { TimelineFiltersDto } from './dto/timeline-filters.dto';
import type { AuditTimelineResponse, BlockchainStats, ChainVisualization, AuditTimelineItem } from './interfaces';

interface FireFlyEvent {
  id: string;
  name: string;
  namespace: string;
  created: string;
  timestamp?: string;
  tx?: {
    id: string;
    blockchainId?: string;
  };
  output?: Record<string, unknown>;
  listener?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly fireflyService: FireFlyService,
    private readonly telemetryService: TelemetryService,
  ) {}

  private verifyEd25519Signature(
    telemetryHash: string,
    signatureB64: string,
    publicKeyPem: string,
  ): boolean {
    try {
      const isValid = crypto.verify(
        undefined,
        Buffer.from(telemetryHash),
        { key: publicKeyPem, format: 'pem' },
        Buffer.from(signatureB64, 'base64'),
      );
      return isValid;
    } catch (error) {
      console.error('[SIGNATURE_VERIFY_ERROR]', error.message);
      return false;
    }
  }

  private resolveActorName(output: Record<string, unknown>): string {
    if (output.ecosystemId) return `Ecosistema ${output.ecosystemId}`;
    if (output.userId) return `Usuario ${output.userId}`;
    if (output.ingestId) return `Ingesta ${output.ingestId}`;
    if (output.signer && typeof output.signer === 'string') {
      const signerParts = (output.signer as string).split('::');
      return signerParts[0] || 'FireFly System';
    }
    return 'Sistema';
  }

  private resolveEventType(eventName: string): 'TELEMETRY' | 'ADMINISTRATIVE' | 'FIREFLY' {
    const lower = eventName.toLowerCase();
    if (lower.includes('telemetry') || lower.includes('anchor')) return 'TELEMETRY';
    if (lower.includes('batchpin') || lower.includes('batch_pin')) return 'FIREFLY';
    return 'ADMINISTRATIVE';
  }

  private formatTimestamp(ts: string | number | undefined): string {
    if (!ts) return new Date().toISOString();
    if (typeof ts === 'number') {
      return new Date(ts > 9999999999 ? ts : ts * 1000).toISOString();
    }
    const date = new Date(ts);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  private async verifyTelemetryIntegrity(
    eventType: string,
    telemetryHash: string,
    signature: string,
    publicKey: string,
    output: Record<string, unknown>,
    eventId: string,
  ): Promise<{ signatureValid: boolean; integrityStatus: 'VERIFIED' | 'DISCREPANCY'; dbRecord: Record<string, unknown> | null }> {
    let signatureValid = false;
    let integrityStatus: 'VERIFIED' | 'DISCREPANCY' = 'VERIFIED';
    let dbRecord: Record<string, unknown> | null = null;

    if (eventType !== 'TELEMETRY' || !telemetryHash || !signature || !publicKey) {
      return { signatureValid, integrityStatus, dbRecord };
    }

    signatureValid = this.verifyEd25519Signature(telemetryHash, signature, publicKey);

    if (!signatureValid) {
      return { signatureValid, integrityStatus: 'DISCREPANCY', dbRecord };
    }

    const ingestId = output.ingestId?.toString() || eventId;
    if (!ingestId) {
      return { signatureValid, integrityStatus, dbRecord };
    }

    const telemetryDoc = await this.telemetryService.findByIngestId(ingestId);
    if (!telemetryDoc) {
      return { signatureValid, integrityStatus, dbRecord };
    }

    dbRecord = {
      timestamp: telemetryDoc.timestamp,
      payload: telemetryDoc.payload,
      hash: telemetryDoc.hash,
      metadata: telemetryDoc.metadata,
    };

    const isIntegrityValid = await this.telemetryService.verifyIntegrity(telemetryHash, ingestId);
    if (!isIntegrityValid) {
      integrityStatus = 'DISCREPANCY';
    }

    return { signatureValid, integrityStatus, dbRecord };
  }

  private async mapEventToTimelineItem(event: FireFlyEvent): Promise<AuditTimelineItem> {
    const output = event.output || {};
    const eventName = event.name || 'Evento Blockchain';
    const telemetryHash = output.telemetryHash?.toString() || output.hash?.toString() || '';
    const signature = output.signature?.toString() || '';
    const publicKey = output.publicKey?.toString() || '';
    const eventType = this.resolveEventType(eventName);

    const { signatureValid, integrityStatus, dbRecord } = await this.verifyTelemetryIntegrity(
      eventType, telemetryHash, signature, publicKey, output, event.id,
    );

    return {
      eventId: event.id,
      timestamp: this.formatTimestamp(event.timestamp),
      action: eventName,
      actorName: this.resolveActorName(output),
      type: eventType,
      integrityStatus,
      blockchainTxId: event.tx?.blockchainId || event.tx?.id || '',
      blockNumber: undefined,
      telemetryHash,
      ecosystemId: output.ecosystemId?.toString() || '',
      ingestId: output.ingestId?.toString() || event.id,
      output: output,
      signatureValid,
      dbRecord: dbRecord || {},
    };
  }

  private filterTimelineByDate(
    timeline: AuditTimelineItem[],
    startDate?: string,
    endDate?: string,
  ): AuditTimelineItem[] {
    if (!startDate && !endDate) return timeline;

    return timeline.filter((item) => {
      const eventTime = new Date(item.timestamp);
      if (startDate && eventTime < new Date(startDate)) return false;
      if (endDate && eventTime > new Date(endDate)) return false;
      return true;
    });
  }

  async getTimeline(filters: TimelineFiltersDto): Promise<AuditTimelineResponse> {
    try {
      const params: { limit?: number; skip?: number; filter?: string } = {};

      if (filters.limit) params.limit = filters.limit;
      if (filters.offset) params.skip = filters.offset;

      if (filters.eventType) {
        if (filters.eventType === 'TELEMETRY') {
          params.filter = 'name=~Telemetry';
        } else if (filters.eventType === 'ADMINISTRATIVE') {
          params.filter = 'name=~';
        }
      }

      const fireflyResponse = await this.fireflyService.getEvents(params);
      const events: FireFlyEvent[] = Array.isArray(fireflyResponse)
        ? fireflyResponse
        : (fireflyResponse.items || []);

      const timeline = await Promise.all(events.map((event) => this.mapEventToTimelineItem(event)));

      let filteredTimeline = this.filterTimelineByDate(timeline, filters.startDate, filters.endDate);

      if (filters.ecosystemId) {
        filteredTimeline = filteredTimeline.filter(
          (item) => item.ecosystemId === filters.ecosystemId,
        );
      }

      return {
        timeline: filteredTimeline,
        pagination: {
          total: filteredTimeline.length,
          limit: filters.limit || 50,
          offset: filters.offset || 0,
        },
      };
    } catch (error) {
      console.error('Error fetching timeline:', error.message);
      return {
        timeline: [],
        pagination: { total: 0, limit: filters.limit || 50, offset: filters.offset || 0 },
      };
    }
  }

  async getStats(): Promise<BlockchainStats> {
    return {
      totalAnchors: 0,
      successRate: 0,
      totalBlocks: 0,
      totalTransactions: 0,
      avgAnchorsPerBlock: 0,
      activeEcosystems: 0,
      lastBlockNumber: 0,
      lastBlockTime: '',
    };
  }

  async getChainVisualization(startBlock?: number, endBlock?: number, limit: number = 50): Promise<ChainVisualization> {
    return {
      chain: [],
      summary: {
        totalBlocks: 0,
        totalTransactions: 0,
        chainHealth: 'healthy',
        latestBlockNumber: 0,
        latestBlockTime: '',
      },
    };
  }

  async getBlockDetails(blockNumber: number): Promise<any> {
    return {};
  }
}