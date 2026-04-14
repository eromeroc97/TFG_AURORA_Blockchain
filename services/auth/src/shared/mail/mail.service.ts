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
      text: [
        'Tu cuenta ha sido creada correctamente.',
        'La cuenta permanece pendiente de validacion por un administrador.',
        `Tu contrasena temporal es: ${plainPassword}`,
        'Cuando un administrador valide tu usuario, se te comunicara el siguiente paso.',
      ].join('\n\n'),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
          <h2>Tu cuenta ha sido creada</h2>
          <p>Tu cuenta ha sido creada correctamente y permanece <strong>pendiente de validacion</strong> por un administrador.</p>
          <p><strong>Contrasena temporal:</strong> <code>${plainPassword}</code></p>
          <p>Cuando la cuenta sea validada, podras continuar con el proceso de acceso.</p>
          <p>Saludos,<br/>Equipo AURORA</p>
        </div>
      `,
    });

    this.logger.log(`Welcome email sent to ${email}`);
  }
}
