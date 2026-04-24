import { Module, forwardRef } from '@nestjs/common';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { CryptoModule } from '../../crypto/crypto.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { MailModule } from '../../shared/mail/mail.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, MailModule, CryptoModule, BlockchainModule, RedisModule, forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
