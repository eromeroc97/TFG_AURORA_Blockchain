import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimelineFiltersDto } from './dto/timeline-filters.dto';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: { getTimeline: jest.Mock; getStats: jest.Mock; getChainVisualization: jest.Mock; getBlockDetails: jest.Mock };

  beforeEach(async () => {
    auditService = {
      getTimeline: jest.fn(),
      getStats: jest.fn(),
      getChainVisualization: jest.fn(),
      getBlockDetails: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTimeline', () => {
    it('should call service with filters', async () => {
      const filters: TimelineFiltersDto = { limit: 20, offset: 0, eventType: 'TELEMETRY' };
      auditService.getTimeline.mockResolvedValue({ timeline: [], pagination: { total: 0, limit: 20, offset: 0 } });

      const result = await controller.getTimeline(filters);

      expect(auditService.getTimeline).toHaveBeenCalledWith(filters);
      expect(result).toEqual({ timeline: [], pagination: { total: 0, limit: 20, offset: 0 } });
    });

    it('should pass empty filters when no query params', async () => {
      const filters = {} as TimelineFiltersDto;
      auditService.getTimeline.mockResolvedValue({ timeline: [], pagination: { total: 0, limit: 50, offset: 0 } });

      const result = await controller.getTimeline(filters);

      expect(auditService.getTimeline).toHaveBeenCalledWith({});
      expect(result.pagination.limit).toBe(50);
    });
  });

  describe('getStats', () => {
    it('should return stats from service', async () => {
      const stats = { totalAnchors: 10, successRate: 95, totalBlocks: 5, totalTransactions: 20, avgAnchorsPerBlock: 2, activeEcosystems: 3, lastBlockNumber: 100, lastBlockTime: '2025-01-01T00:00:00Z' };
      auditService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(auditService.getStats).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('getChainVisualization', () => {
    it('should call service with default limit', async () => {
      auditService.getChainVisualization.mockResolvedValue({ chain: [], summary: { totalBlocks: 0, totalTransactions: 0, chainHealth: 'healthy', latestBlockNumber: 0, latestBlockTime: '' } });

      await controller.getChainVisualization(undefined, undefined, undefined);

      expect(auditService.getChainVisualization).toHaveBeenCalledWith(undefined, undefined, 50);
    });

    it('should call service with provided params', async () => {
      auditService.getChainVisualization.mockResolvedValue({ chain: [], summary: { totalBlocks: 0, totalTransactions: 0, chainHealth: 'healthy', latestBlockNumber: 100, latestBlockTime: '' } });

      await controller.getChainVisualization(0, 100, 20);

      expect(auditService.getChainVisualization).toHaveBeenCalledWith(0, 100, 20);
    });
  });

  describe('getBlockDetails', () => {
    it('should call service with block number', async () => {
      auditService.getBlockDetails.mockResolvedValue({ hash: '0xabc', number: 42 });

      const result = await controller.getBlockDetails(42);

      expect(auditService.getBlockDetails).toHaveBeenCalledWith(42);
      expect(result).toEqual({ hash: '0xabc', number: 42 });
    });
  });
});
