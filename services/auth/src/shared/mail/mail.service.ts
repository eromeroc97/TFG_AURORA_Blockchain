import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Role } from '@prisma/client';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  /**
   * Envía correo de bienvenida al usuario
   * @param email - Email del usuario
   * @description Indica que la cuenta está en estado PENDING, sin mostrar credenciales
   */
  async sendWelcomeEmail(email: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Bienvenido a AURORA - Cuenta Creada',
      template: './welcome',
      context: {
        // No incluir email ni password en welcome por política de privacidad
      },
    });

    this.logger.log(`Welcome email sent to ${email}`);
  }

  /**
   * Envía correo de verificación exitosa
   * @param email - Email del usuario
   * @param actionUrl - URL para establecer contraseña
   * @description Confirma que el email fue verificado e incluye el token de acción
   */
  async sendVerifyEmail(email: string, actionUrl: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Verifica tu correo en AURORA - Establecer Contraseña',
      template: './verify',
      context: {
        email,
        action_url: actionUrl,
      },
    });

    this.logger.log(`Verify email sent to ${email}`);
  }

  /**
   * Envía correo de recuperación de contraseña
   * @param email - Email del usuario (para auditoría)
   * @param actionUrl - URL para restablecer contraseña
   * @description NO incluye el email en el contexto de la plantilla por privacidad
   */
  async sendRecoverEmail(email: string, actionUrl: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Recupera tu acceso a AURORA - Restablecer Contraseña',
      template: './recover',
      context: {
        action_url: actionUrl,
      },
    });

    this.logger.log(`Password recovery email sent to ${email}`);
  }

  /**
   * Envía correo de prueba del sistema
   * @param email - Email de prueba
   * @description Verifica que el servicio de correos está funcionando correctamente
   */
  async sendTestEmail(email: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'AURORA - Correo de Prueba del Sistema',
      template: './test',
      context: {
        email,
      },
    });

    this.logger.log(`Test template email sent to ${email}`);
  }

  async sendRoleChangedEmail(email: string, newRole: Role, previousRole?: Role): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'AURORA - Actualización de Rol de Acceso',
      template: './role-changed',
      context: {
        previous_role: previousRole ?? null,
        new_role: newRole,
      },
    });

    this.logger.log(`Role changed email sent to ${email}`);
  }

  async sendAccountDeletedEmail(email: string, revokedAt: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'AURORA - Cuenta Revocada',
      template: './account-deleted',
      context: {
        revoked_at: revokedAt,
      },
    });

    this.logger.log(`Account deleted email sent to ${email}`);
  }
}
