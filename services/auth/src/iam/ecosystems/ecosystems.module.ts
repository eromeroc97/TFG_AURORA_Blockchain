import { Module } from '@nestjs/common';
import { EcosystemsService } from './ecosystems.service';
import { EcosystemsController } from './ecosystems.controller';
import { InternalAuthController } from './internal-ecosystems.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { CryptoModule } from '../../crypto/crypto.module';

@Module({
  imports: [PrismaModule, BlockchainModule, CryptoModule],
  controllers: [EcosystemsController, InternalAuthController],
  providers: [EcosystemsService],
})
export class EcosystemsModule {}
