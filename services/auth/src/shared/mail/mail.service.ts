import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendWelcomeEmail(email: string, plainPassword: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Bienvenido a AURORA - cuenta creada',
      template: './welcome',
      context: {
        email,
        password: plainPassword,
      },
    });

    this.logger.log(`Welcome email sent to ${email}`);
  }

  async sendTestEmail(email: string, plainPassword: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'AURORA - Correo de prueba de plantilla',
      template: './test',
      context: {
        email,
        password: plainPassword,
      },
    });

    this.logger.log(`Test template email sent to ${email}`);
  }
}
