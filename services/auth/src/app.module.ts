import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { UsersModule } from './iam/users/users.module';
import { EcosystemsModule } from './iam/ecosystems/ecosystems.module';

@Module({
  imports: [UsersModule, EcosystemsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
