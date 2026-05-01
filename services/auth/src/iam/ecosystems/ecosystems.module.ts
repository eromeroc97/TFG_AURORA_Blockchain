import { Module } from '@nestjs/common';
import { EcosystemsService } from './ecosystems.service';
import { EcosystemsController } from './ecosystems.controller';
import { InternalUsersController } from './internal-ecosystems.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { CryptoModule } from '../../crypto/crypto.module';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports: [PrismaModule, BlockchainModule, CryptoModule, MailModule],
  controllers: [EcosystemsController, InternalUsersController],
  providers: [EcosystemsService],
})
export class EcosystemsModule {}
