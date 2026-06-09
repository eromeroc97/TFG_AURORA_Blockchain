import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { FireFlyService } from '../firefly/firefly.service';
import { TelemetryService } from '../telemetry/telemetry.service';

describe('AuditService', () => {
  let service: AuditService;
  let fireflyService: { getEvents: jest.Mock };
  let telemetryService: { findByIngestId: jest.Mock; verifyIntegrity: jest.Mock };

  beforeEach(async () => {
    fireflyService = {
      getEvents: jest.fn(),
    };

    telemetryService = {
      findByIngestId: jest.fn(),
      verifyIntegrity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: FireFlyService,
          useValue: fireflyService,
        },
        {
          provide: TelemetryService,
          useValue: telemetryService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyEd25519Signature', () => {
    it('should return false for invalid signature', () => {
      const result = (service as any).verifyEd25519Signature(
        'some-hash',
        'invalid-signature',
        '-----BEGIN PUBLIC KEY-----\ninvalid\n-----END PUBLIC KEY-----'
      );
      expect(result).toBe(false);
    });

    it('should return false for invalid public key format', () => {
      const result = (service as any).verifyEd25519Signature(
        'some-hash',
        'c29tZXNpZ25hdHVyZQ==',
        'not-a-pem-key'
      );
      expect(result).toBe(false);
    });
  });

  describe('getTimeline', () => {
    it('should return empty timeline when FireFly returns error', async () => {
      fireflyService.getEvents.mockRejectedValue(new Error('Connection failed'));

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should return timeline with empty items when FireFly returns null', async () => {
      fireflyService.getEvents.mockResolvedValue(null);

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline).toEqual([]);
    });

    it('should filter by event name TelemetryAnchored', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'TelemetryAnchored', timestamp: '2025-01-01', output: { telemetryHash: 'hash1', signature: 'sig1', publicKey: 'pub1' } },
          { id: '2', name: 'batch_pin', timestamp: '2025-01-02', output: {} },
        ],
      });
      telemetryService.findByIngestId.mockResolvedValue(null);

      const result = await service.getTimeline({ eventName: 'TelemetryAnchored', limit: 50, offset: 0 });

      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].action).toBe('TelemetryAnchored');
      expect(result.timeline[0].type).toBe('TELEMETRY');
    });

    it('should filter by ecosystem ID', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event1', timestamp: '2025-01-01', output: { ecosystemId: 'eco-1' } },
          { id: '2', name: 'Event2', timestamp: '2025-01-02', output: { ecosystemId: 'eco-2' } },
        ],
      });

      const result = await service.getTimeline({ ecosystemId: 'eco-1', limit: 50, offset: 0 });

      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].ecosystemId).toBe('eco-1');
    });

    it('should filter by start date', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event1', timestamp: '2025-01-01T00:00:00Z' },
          { id: '2', name: 'Event2', timestamp: '2025-01-15T00:00:00Z' },
        ],
      });

      const result = await service.getTimeline({ startDate: '2025-01-10T00:00:00Z', limit: 50, offset: 0 });

      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].timestamp).toBe('2025-01-15T00:00:00.000Z');
    });

    it('should filter by end date', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event1', timestamp: '2025-01-01T00:00:00Z' },
          { id: '2', name: 'Event2', timestamp: '2025-01-15T00:00:00Z' },
        ],
      });

      const result = await service.getTimeline({ endDate: '2025-01-10T00:00:00Z', limit: 50, offset: 0 });

      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].timestamp).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should determine actor name from ecosystemId', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01', output: { ecosystemId: 'eco-123' } },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].actorName).toBe('Ecosistema eco-123');
    });

    it('should determine actor name from userId', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01', output: { userId: 'user-1' } },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].actorName).toBe('Usuario user-1');
    });

    it('should determine actor name from ingestId', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01', output: { ingestId: 'ingest-1' } },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].actorName).toBe('Ingesta ingest-1');
    });

    it('should determine actor name from signer', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01', output: { signer: 'signer1::key' } },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].actorName).toBe('signer1');
    });

    it('should classify event type as TELEMETRY for telemetry events', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'TelemetryEvent', timestamp: '2025-01-01', output: {} },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].type).toBe('TELEMETRY');
    });

    it('should classify event type as TELEMETRY for anchor events', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'AnchorTelemetry', timestamp: '2025-01-01', output: {} },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].type).toBe('TELEMETRY');
    });

    it('should classify event type as FIREFLY for batchpin events', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'BatchPin', timestamp: '2025-01-01', output: {} },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].type).toBe('FIREFLY');
    });

    it('should classify event type as FIREFLY for batch_pin events', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'batch_pin', timestamp: '2025-01-01', output: {} },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].type).toBe('FIREFLY');
    });

    it('should handle pagination parameters', async () => {
      fireflyService.getEvents.mockResolvedValue({ items: [] });

      await service.getTimeline({ limit: 10, offset: 20 });

      expect(fireflyService.getEvents).toHaveBeenCalledWith({
        limit: 10,
        skip: 20,
      });
    });

    it('should handle numeric timestamps', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: 1735689600, output: {} },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].timestamp).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should handle numeric timestamp in milliseconds', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: 1735689600000, output: {} },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].timestamp).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should handle undefined timestamp', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: undefined, output: {} },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].timestamp).toBeDefined();
    });

    it('should handle invalid timestamp string', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: 'invalid-date', output: {} },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].timestamp).toBeDefined();
    });

    it('should filter by event name ActionAnchored', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'ActionAnchored', timestamp: '2025-01-01', output: { action_type: 'add_role' } },
          { id: '2', name: 'TelemetryAnchored', timestamp: '2025-01-02', output: {} },
        ],
      });

      const result = await service.getTimeline({ eventName: 'ActionAnchored', limit: 50, offset: 0 });

      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].action).toBe('ActionAnchored');
      expect(result.timeline[0].type).toBe('ADMINISTRATIVE');
    });

    it('should handle events as array directly', async () => {
      fireflyService.getEvents.mockResolvedValue([
        { id: '1', name: 'Event1', timestamp: '2025-01-01', output: {} },
        { id: '2', name: 'Event2', timestamp: '2025-01-02', output: {} },
      ]);

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline).toHaveLength(2);
    });

    it('should handle events with empty items array', async () => {
      fireflyService.getEvents.mockResolvedValue({ items: [] });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle event with undefined output', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01', output: undefined },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].actorName).toBe('Sistema');
    });

    it('should handle event with null output', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01', output: null },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].actorName).toBe('Sistema');
    });

    it('should handle signer with empty first part', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01', output: { signer: '::key' } },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].actorName).toBe('FireFly System');
    });

    it('should use hash as telemetryHash when telemetryHash is empty', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'TelemetryEvent', timestamp: '2025-01-01', output: { hash: 'test-hash', signature: 'sig', publicKey: 'pub' } },
        ],
      });
      telemetryService.findByIngestId.mockResolvedValue(null);

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].telemetryHash).toBe('test-hash');
    });

    it('should return empty object when output is not present', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01' },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].output).toEqual({});
    });

    it('should handle blockchain tx id from tx.id', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01', output: {}, tx: { id: 'tx-123' } },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].blockchainTxId).toBe('tx-123');
    });

    it('should handle blockchain tx id from tx.blockchainId', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01', output: {}, tx: { id: 'tx-123', blockchainId: '0xabc' } },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].blockchainTxId).toBe('0xabc');
    });

    it('should return empty blockchainTxId when no tx', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event', timestamp: '2025-01-01', output: {} },
        ],
      });

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].blockchainTxId).toBe('');
    });

    it('should combine start and end date filters', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'Event1', timestamp: '2025-01-05T00:00:00Z' },
          { id: '2', name: 'Event2', timestamp: '2025-01-15T00:00:00Z' },
          { id: '3', name: 'Event3', timestamp: '2025-01-25T00:00:00Z' },
        ],
      });

      const result = await service.getTimeline({ 
        startDate: '2025-01-10T00:00:00Z', 
        endDate: '2025-01-20T00:00:00Z',
        limit: 50, 
        offset: 0 
      });

      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].eventId).toBe('2');
    });

    it('should filter by eventName and ecosystemId together', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: '1', name: 'TelemetryAnchored', timestamp: '2025-01-01', output: { ecosystemId: 'eco-1' } },
          { id: '2', name: 'TelemetryAnchored', timestamp: '2025-01-02', output: { ecosystemId: 'eco-2' } },
        ],
      });
      telemetryService.findByIngestId.mockResolvedValue(null);

      const result = await service.getTimeline({ eventName: 'TelemetryAnchored', ecosystemId: 'eco-1', limit: 50, offset: 0 });

      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].ecosystemId).toBe('eco-1');
    });

    it('should use event id as ingestId when output.ingestId is empty', async () => {
      fireflyService.getEvents.mockResolvedValue({
        items: [
          { id: 'event-123', name: 'TelemetryEvent', timestamp: '2025-01-01', output: { telemetryHash: 'hash', signature: 'sig', publicKey: 'pub' } },
        ],
      });
      telemetryService.findByIngestId.mockResolvedValue(null);

      const result = await service.getTimeline({ limit: 50, offset: 0 });

      expect(result.timeline[0].ingestId).toBe('event-123');
    });
  });

  describe('getStats', () => {
    it('should return default stats', async () => {
      const result = await service.getStats();

      expect(result).toEqual({
        totalAnchors: 0,
        successRate: 0,
        totalBlocks: 0,
        totalTransactions: 0,
        avgAnchorsPerBlock: 0,
        activeEcosystems: 0,
        lastBlockNumber: 0,
        lastBlockTime: '',
      });
    });
  });

  describe('getChainVisualization', () => {
    it('should return empty chain visualization', async () => {
      const result = await service.getChainVisualization();

      expect(result).toEqual({
        chain: [],
        summary: {
          totalBlocks: 0,
          totalTransactions: 0,
          chainHealth: 'healthy',
          latestBlockNumber: 0,
          latestBlockTime: '',
        },
      });
    });
  });

  describe('getBlockDetails', () => {
    it('should return empty object', async () => {
      const result = await service.getBlockDetails(1);

      expect(result).toEqual({});
    });
  });
});