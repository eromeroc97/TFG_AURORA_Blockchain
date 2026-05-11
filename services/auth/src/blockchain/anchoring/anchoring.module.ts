import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';
import { CryptoModule } from '../../crypto/crypto.module';
import { ActionsAnchorService } from './actions-anchor.service';
import { ActionsQueryService } from './query.service';

@Module({
  imports: [HttpModule, PrismaModule, CryptoModule],
  providers: [ActionsAnchorService, ActionsQueryService],
  exports: [ActionsAnchorService, ActionsQueryService],
})
export class AnchoringModule {}
