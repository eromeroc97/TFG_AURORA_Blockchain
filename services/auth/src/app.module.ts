import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { UsersModule } from './iam/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
