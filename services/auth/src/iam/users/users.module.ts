import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../../shared/mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
