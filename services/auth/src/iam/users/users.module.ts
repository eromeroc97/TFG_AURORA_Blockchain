import { Module } from '@nestjs/common';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule, BlockchainModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
