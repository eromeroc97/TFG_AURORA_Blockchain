import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { FireFlyModule } from '../firefly/firefly.module';
import { TelemetryModule } from '../telemetry/telemetry.module';

@Module({
  imports: [FireFlyModule, TelemetryModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
