import { Module } from '@nestjs/common';
import { EcosystemsService } from './ecosystems.service';
import { EcosystemsController } from './ecosystems.controller';
import { InternalEcosystemsController } from './internal-ecosystems.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';

@Module({
  imports: [PrismaModule, BlockchainModule],
  controllers: [EcosystemsController, InternalEcosystemsController],
  providers: [EcosystemsService],
})
export class EcosystemsModule {}
