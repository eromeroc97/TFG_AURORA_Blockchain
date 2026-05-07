import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { MongoDbModule } from './mongodb/mongodb.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    MongoDbModule,
    TelemetryModule,
    AuditModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
