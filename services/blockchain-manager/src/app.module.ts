import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { BlockchainModule } from './blockchain/blockchain.module';

@Module({
  imports: [AuthModule, BlockchainModule],
  controllers: [HealthController],
})
export class AppModule {}