import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DevicesModule } from './iam/devices/devices.module';
import { UsersModule } from './iam/users/users.module';
import { EcosystemsModule } from './iam/ecosystems/ecosystems.module';
import { AuthModule } from './iam/auth/auth.module';
import { RedisModule } from './iam/redis/redis.module';

@Module({
  imports: [UsersModule, EcosystemsModule, DevicesModule, AuthModule, RedisModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
