import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Role } from '@prisma/client';

/**
 * Servicio de correos electrónicos.
 * Envía emails transacciones a usuarios.
 *
 * Propósito de seguridad:
 * - Notifica creación de cuentas
 * - Envía enlaces de recuperación
 * - Confirma cambios de seguridad
 */
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

  async sendEcosystemDelegationRequestEmail(
    email: string,
    ecosystemName: string,
    ownerEmail: string,
    role: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Petición de acceso a ecosistema en AURORA',
      template: './ecosystem-delegation-request',
      context: {
        ecosystem_name: ecosystemName,
        owner_email: ownerEmail,
        role,
        requested_at: new Date().toLocaleDateString('es-ES'),
      },
    });

    this.logger.log(`Ecosystem delegation request email sent to ${email}`);
  }

  async sendNewNotificationEmail(email: string, notificationTitle: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Nueva notificación - AURORA',
      template: './new-notification',
      context: {
        notification_title: notificationTitle,
        action_url: `${process.env.FRONTEND_URL ?? 'http://localhost'}/notifications`,
      },
    });

    this.logger.log(`New notification email sent to ${email}`);
  }

  async sendEcosystemDelegationResponseEmail(
    email: string,
    ecosystemName: string,
    responderEmail: string,
    result: 'aceptada' | 'rechazada',
  ): Promise<void> {
    const notificationTitle = result === 'aceptada' ? 'Solicitud aceptada' : 'Solicitud rechazada'

    await this.mailerService.sendMail({
      to: email,
      subject: 'Nueva notificación - AURORA',
      template: './new-notification',
      context: {
        notification_title: notificationTitle,
        action_url: `${process.env.FRONTEND_URL ?? 'http://localhost'}/notifications`,
      },
    });

    this.logger.log(`Ecosystem delegation response notification email sent to ${email}`);
  }
}
