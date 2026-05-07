import { Injectable } from '@nestjs/common';
import { FireFlyService } from '../firefly/firefly.service';
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
  constructor(private readonly fireflyService: FireFlyService) {}

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

      const timeline: AuditTimelineItem[] = events.map((event: FireFlyEvent) => {
        const output = event.output || {};
        
        let actorName = 'Sistema';
        if (output.ecosystemId) {
          actorName = `Ecosistema ${output.ecosystemId}`;
        } else if (output.userId) {
          actorName = `Usuario ${output.userId}`;
        } else if (output.ingestId) {
          actorName = `Ingesta ${output.ingestId}`;
        } else if (output.signer && typeof output.signer === 'string') {
          const signerParts = output.signer.split('::');
          actorName = signerParts[0] || 'FireFly System';
        }

        const eventName = event.name || 'Evento Blockchain';
        
        let eventType: 'TELEMETRY' | 'ADMINISTRATIVE' | 'FIREFLY' = 'ADMINISTRATIVE';
        if (eventName.toLowerCase().includes('telemetry') || eventName.toLowerCase().includes('anchor')) {
          eventType = 'TELEMETRY';
        } else if (eventName.toLowerCase().includes('batchpin') || eventName.toLowerCase().includes('batch_pin')) {
          eventType = 'FIREFLY';
        }

        const formatTimestamp = (ts: string | number | undefined): string => {
          if (!ts) return new Date().toISOString();
          if (typeof ts === 'number') {
            return new Date(ts > 9999999999 ? ts : ts * 1000).toISOString();
          }
          const date = new Date(ts);
          return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
        };

        return {
          eventId: event.id,
          timestamp: formatTimestamp(event.timestamp),
          action: eventName,
          actorName,
          type: eventType,
          integrityStatus: 'VERIFIED',
          blockchainTxId: event.tx?.blockchainId || event.tx?.id || '',
          blockNumber: undefined,
          telemetryHash: output.hash?.toString() || output.telemetryHash?.toString() || '',
          ecosystemId: output.ecosystemId?.toString() || '',
          ingestId: output.ingestId?.toString() || event.id,
          output: output,
        };
      });

      let filteredTimeline = timeline;
      
      if (filters.startDate || filters.endDate) {
        filteredTimeline = timeline.filter((item) => {
          const eventTime = new Date(item.timestamp);
          if (filters.startDate && eventTime < new Date(filters.startDate)) return false;
          if (filters.endDate && eventTime > new Date(filters.endDate)) return false;
          return true;
        });
      }

      if (filters.ecosystemId) {
        filteredTimeline = filteredTimeline.filter(
          (item) => item.ecosystemId === filters.ecosystemId
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