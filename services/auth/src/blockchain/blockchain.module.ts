import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FireflyService } from './firefly.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 30000,
      }),
    }),
  ],
  providers: [FireflyService],
  exports: [FireflyService, HttpModule],
})
export class BlockchainModule {}