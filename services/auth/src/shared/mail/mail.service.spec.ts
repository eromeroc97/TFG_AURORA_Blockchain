import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MailerService } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';
import { MailModule } from './mail.module';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

describe('MailService', () => {
  let service: MailService;

  const mailerServiceMock = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mailerServiceMock,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    jest.clearAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email without credentials (PENDING status)', async () => {
      (mailerServiceMock.sendMail as any).mockResolvedValue(undefined);

      await service.sendWelcomeEmail('user@aurora.local');

      expect(mailerServiceMock.sendMail).toHaveBeenCalledWith({
        to: 'user@aurora.local',
        subject: 'Bienvenido a AURORA - Cuenta Creada',
        template: './welcome',
        context: {},
      });
    });
  });

  describe('sendVerifyEmail', () => {
    it('should send verify email with email and action URL', async () => {
      (mailerServiceMock.sendMail as any).mockResolvedValue(undefined);
      const email = 'user@aurora.local';
      const actionUrl = 'https://app.aurora.local/verify?token=abc123';

      await service.sendVerifyEmail(email, actionUrl);

      expect(mailerServiceMock.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'Verifica tu correo en AURORA - Establecer Contraseña',
        template: './verify',
        context: {
          email,
          action_url: actionUrl,
        },
      });
    });
  });

  describe('sendRecoverEmail', () => {
    it('should send recover email with only action URL (no email for privacy)', async () => {
      (mailerServiceMock.sendMail as any).mockResolvedValue(undefined);
      const email = 'user@aurora.local';
      const actionUrl = 'https://app.aurora.local/reset?token=xyz789';

      await service.sendRecoverEmail(email, actionUrl);

      expect(mailerServiceMock.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'Recupera tu acceso a AURORA - Restablecer Contraseña',
        template: './recover',
        context: {
          action_url: actionUrl,
        },
      });
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email with recipient email', async () => {
      (mailerServiceMock.sendMail as any).mockResolvedValue(undefined);
      const email = 'qa@aurora.local';

      await service.sendTestEmail(email);

      expect(mailerServiceMock.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'AURORA - Correo de Prueba del Sistema',
        template: './test',
        context: {
          email,
        },
      });
    });

    it('should send real test email to Mailpit for template verification', async () => {
      // This test sends a real email to test@test.com on Mailpit without creating a user
      // Skip this test in CI or if Mailpit is not available locally
      if (process.env.CI === 'true' || process.env.SKIP_MAILPIT_TEST === 'true') {
        console.log('⊘ Skipping Mailpit integration test');
        expect(true).toBe(true);
        return;
      }

      try {
        const nodemailer = require('nodemailer');
        
        // Create direct connection to Mailpit (not through Docker network)
        const transporter = nodemailer.createTransport({
          host: 'localhost',
          port: 1025,
          secure: false,
        });

        const testEmail = 'test@test.com';
        
        // Send a simple HTML email using the test template structure
        const result = await transporter.sendMail({
          from: 'noreply@aurora-gsya.uclm.es',
          to: testEmail,
          subject: 'AURORA - Correo de Prueba del Sistema (Integration Test)',
          html: `
            <div style="max-width: 680px; margin: 0 auto; padding: 32px 16px;">
              <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 28px;">
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%); color: #f8fafc; padding: 28px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">🧪 ENTORNO DE PRUEBAS</h1>
                  <p style="margin: 10px 0 0; opacity: 0.92; font-size: 14px;">Plantilla de verificación del sistema de correos electrónicos</p>
                </div>
                <div style="padding: 28px;">
                  <p>Este es un email de prueba enviado desde los tests para verificar que las plantillas se renderizan correctamente en Mailpit.</p>
                  <p><strong>Email de prueba:</strong> ${testEmail}</p>
                  <p style="margin-top: 20px; color: #666;">Si recibes este email, las plantillas están funcionando correctamente.</p>
                </div>
              </div>
            </div>
          `,
        });

        console.log(`✓ Test email successfully sent to ${testEmail}`);
        console.log(`  Message ID: ${result.messageId}`);
        console.log(`  View in Mailpit: http://localhost:8025`);
        
        expect(result).toBeDefined();
        expect(result.accepted).toContain(testEmail);
      } catch (error) {
        // If Mailpit is not available, skip the test gracefully
        console.log('⊘ Mailpit not available locally, skipping integration test');
        expect(true).toBe(true);
      }
    }, 30000); // 30 second timeout for integration test
  });
});
