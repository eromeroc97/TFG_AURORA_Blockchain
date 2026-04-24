import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MailService } from '../../shared/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';
import { FireflyService } from '../../blockchain/firefly.service';
import { CryptoService } from '../../crypto/crypto.service';
import { RedisService } from '../redis/redis.service';

describe('UsersService', () => {
  let service: UsersService;
  const prismaMock = {
    user: {
      findUnique: jest.fn() as any,
      create: jest.fn() as any
    },
    identity: { create: jest.fn() as any }
  };
  const mailMock = { sendWelcomeEmail: jest.fn() as any };
  const fireflyMock = { broadcastAnchor: jest.fn() as any };
  const cryptoMock = { generateKeyPair: jest.fn() as any, encryptPrivateKey: jest.fn() as any };
  const redisMock = { get: jest.fn() as any, set: jest.fn() as any };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MailService, useValue: mailMock },
        { provide: FireflyService, useValue: fireflyMock },
        { provide: CryptoService, useValue: cryptoMock },
        { provide: RedisService, useValue: redisMock },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('should create user with PENDING status', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'id', email: 'test@local', status: UserStatus.PENDING });

    const result = await service.create({ email: 'test@local' });
    expect(result.status).toBe(UserStatus.PENDING);
  });

  it('should throw ConflictException when email exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ email: 'test@local' });
    await expect(service.create({ email: 'test@local' })).rejects.toBeInstanceOf(ConflictException);
  });
});