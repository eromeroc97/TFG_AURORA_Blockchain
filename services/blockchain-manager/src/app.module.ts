import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { FireflyModule } from './firefly/firefly.service';

@Module({
  imports: [FireflyModule],
  controllers: [HealthController],
})
export class AppModule {}