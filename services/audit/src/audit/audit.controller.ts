import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from './audit.service';
import { TimelineFiltersDto } from './dto/timeline-filters.dto';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('timeline')
  async getTimeline(@Query() filters: TimelineFiltersDto) {
    return this.auditService.getTimeline(filters);
  }

  @Get('stats')
  async getStats() {
    return this.auditService.getStats();
  }

  @Get('ingest/:ingestId')
  async getByIngestId(@Param('ingestId') ingestId: string) {
    return this.auditService.getByIngestId(ingestId);
  }

  @Get('hash/:hash')
  async getByHash(@Param('hash') hash: string) {
    return this.auditService.getByHash(hash);
  }

  @Get('ecosystem/:ecosystemId')
  async getByEcosystem(
    @Param('ecosystemId') ecosystemId: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
  ) {
    return this.auditService.getByEcosystem(ecosystemId, startTime, endTime);
  }

  @Get('chain/visual')
  async getChainVisualization(
    @Query('startBlock') startBlock?: number,
    @Query('endBlock') endBlock?: number,
    @Query('limit') limit: number = 50,
  ) {
    return this.auditService.getChainVisualization(startBlock, endBlock, limit);
  }

  @Get('block/:blockNumber')
  async getBlockDetails(@Param('blockNumber') blockNumber: number) {
    return this.auditService.getBlockDetails(blockNumber);
  }
}
