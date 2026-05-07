import { Module } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { FireflyModule } from '../firefly/firefly.service';

@Module({
  imports: [FireflyModule],
  controllers: [BlockchainController],
})
export class BlockchainModule {}