import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => ({
        transport: {
          host: process.env.SMTP_HOST ?? 'mailpit',
          port: Number(process.env.SMTP_PORT ?? 1025),
          secure: false,
        },
        defaults: {
          from: 'noreply@aurora-gsya.uclm.es',
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
