import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { FireflyService } from './firefly.service';
import { AnchoringModule } from './anchoring/anchoring.module';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 30000,
      }),
    }),
    AnchoringModule,
  ],
  providers: [FireflyService],
  exports: [FireflyService, HttpModule, AnchoringModule],
})
export class BlockchainModule {}