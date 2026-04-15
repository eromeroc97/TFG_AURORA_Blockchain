import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MailerService } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

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

    it('should call MailerService.sendMail for test@test.com without integration try/catch', async () => {
      const sendMailSpy = jest
        .spyOn(mailerServiceMock, 'sendMail')
        .mockResolvedValue(undefined as never);

      await service.sendTestEmail('test@test.com');

      expect(sendMailSpy).toHaveBeenCalledWith({
        to: 'test@test.com',
        subject: 'AURORA - Correo de Prueba del Sistema',
        template: './test',
        context: {
          email: 'test@test.com',
        },
      });
    });
  });
});
