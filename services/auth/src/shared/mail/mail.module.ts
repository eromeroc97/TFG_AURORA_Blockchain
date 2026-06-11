import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      useFactory: () => {
        const smtpUser = process.env.SMTP_USER?.trim();
        const smtpPass = process.env.SMTP_PASS?.trim();

        return {
          transport: {
            host: process.env.SMTP_HOST ?? 'mailpit',
            port: Number(process.env.SMTP_PORT ?? 1025),
            secure: false,
            auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
          },
        defaults: {
          from: process.env.MAIL_FROM ?? 'noreply@aurora.es',
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
