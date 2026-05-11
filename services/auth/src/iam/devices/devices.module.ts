import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { DevicesController } from './devices.controller';
import { InternalDevicesController } from './internal-devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [PrismaModule, BlockchainModule],
  controllers: [DevicesController, InternalDevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}