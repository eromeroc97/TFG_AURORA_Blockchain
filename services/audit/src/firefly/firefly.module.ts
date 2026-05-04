import { Module } from '@nestjs/common';
import { FireFlyService } from './firefly.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [FireFlyService],
  exports: [FireFlyService],
})
export class FireFlyModule {}
