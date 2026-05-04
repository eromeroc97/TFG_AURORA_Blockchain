import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { BlockchainModule } from './blockchain/blockchain.module';
import { CryptoModule } from './crypto/crypto.module';
import { DevicesModule } from './iam/devices/devices.module';
import { UsersModule } from './iam/users/users.module';
import { EcosystemsModule } from './iam/ecosystems/ecosystems.module';
import { AuthModule } from './iam/auth/auth.module';
import { RedisModule } from './iam/redis/redis.module';
import { NotificationsModule } from './iam/notifications/notifications.module';

@Module({
  imports: [CryptoModule, BlockchainModule, UsersModule, EcosystemsModule, DevicesModule, AuthModule, RedisModule, NotificationsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
