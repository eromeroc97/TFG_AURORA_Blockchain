import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FireflyService } from './firefly.service';

@Module({
  imports: [HttpModule],
  providers: [FireflyService],
  exports: [FireflyService],
})
export class BlockchainModule {}