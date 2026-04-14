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

  it('sendWelcomeEmail uses welcome.hbs template and context', async () => {
    (mailerServiceMock.sendMail as any).mockResolvedValue(undefined);

    await service.sendWelcomeEmail('user@aurora.local', 'Temp1234!');

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith({
      to: 'user@aurora.local',
      subject: 'Bienvenido a AURORA - cuenta creada',
      template: './welcome',
      context: {
        email: 'user@aurora.local',
        password: 'Temp1234!',
      },
    });
  });

  it('sendTestEmail uses test.hbs template and context', async () => {
    (mailerServiceMock.sendMail as any).mockResolvedValue(undefined);

    await service.sendTestEmail('qa@aurora.local', 'Visual-Template-Password');

    expect(mailerServiceMock.sendMail).toHaveBeenCalledWith({
      to: 'qa@aurora.local',
      subject: 'AURORA - Correo de prueba de plantilla',
      template: './test',
      context: {
        email: 'qa@aurora.local',
        password: 'Visual-Template-Password',
      },
    });
  });
});
