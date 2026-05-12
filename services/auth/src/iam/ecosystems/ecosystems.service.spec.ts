import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createCipheriv, randomBytes } from 'crypto';
import { EcosystemStatus, IdentityType, Prisma, Role, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FireflyService } from '../../blockchain/firefly.service';
import { CryptoService } from '../../crypto/crypto.service';
import { MailService } from '../../shared/mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEcosystemDto } from './dto/create-ecosystem.dto';
import { EcosystemsService } from './ecosystems.service';
import { ActionsAnchorService } from '../../blockchain/anchoring/actions-anchor.service';

describe('EcosystemsService', () => {
  let service: EcosystemsService;
  const keyBuffer = Buffer.alloc(32, 7);

  const prismaMock = {
    user: { findUnique: jest.fn<() => Promise<any>>() },
    identity: { create: jest.fn<() => Promise<any>>() },
    ecosystem: {
      create: jest.fn<() => Promise<any>>(),
      findUnique: jest.fn<() => Promise<any>>(),
      findMany: jest.fn<() => Promise<any>>(),
      update: jest.fn<() => Promise<any>>(),
    },
  };

  const fireflyMock = { broadcastAnchor: jest.fn() };
  const cryptoMock = {
    generateKeyPair: jest.fn(),
    encryptPrivateKey: jest.fn(),
    decryptPrivateKey: jest.fn(),
    sign: jest.fn(),
  };
  const mailMock = { sendTemplate: jest.fn(), sendWelcomeEcosystem: jest.fn() };
  const notificationsMock = { createNotification: jest.fn(), createSystemNotification: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EcosystemsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: FireflyService, useValue: fireflyMock },
        { provide: CryptoService, useValue: cryptoMock },
        { provide: MailService, useValue: mailMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: ActionsAnchorService, useValue: { anchorAction: jest.fn() } },
      ],
    }).compile();
    service = module.get<EcosystemsService>(EcosystemsService);
    jest.clearAllMocks();
    process.env.API_KEY_ENCRYPTION_KEY = keyBuffer.toString('base64');
  });

  it('create should throw ForbiddenException when actorId is missing', async () => {
    await expect(service.create({ name: 'test' }, undefined as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create should throw NotFoundException when user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(service.create({ name: 'test' }, 'actor-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create should throw ForbiddenException when user role is not USER', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'id', role: Role.ADMIN, status: UserStatus.ACTIVE, isActive: true, identity: { publicKey: 'key' } });
    await expect(service.create({ name: 'test' }, 'actor-id')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create should throw ForbiddenException when user not active', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'id', role: Role.USER, status: UserStatus.PENDING, isActive: false, identity: { publicKey: 'key' } });
    await expect(service.create({ name: 'test' }, 'actor-id')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create should throw ForbiddenException when user has no identity', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'id', role: Role.USER, status: UserStatus.ACTIVE, isActive: true, identity: null });
    await expect(service.create({ name: 'test' }, 'actor-id')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create should succeed with identity and apiKey', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'id', role: Role.USER, status: UserStatus.ACTIVE, isActive: true, identity: { publicKey: 'key' } });
    cryptoMock.generateKeyPair.mockReturnValue({ publicKey: 'pub', privateKey: 'priv' });
    cryptoMock.encryptPrivateKey.mockReturnValue({ ciphertext: 'c', iv: 'i', authTag: 'a' });
    prismaMock.identity.create.mockResolvedValue({ id: 'ident-id', type: IdentityType.ECOSYSTEM });
    prismaMock.ecosystem.create.mockResolvedValue({ id: 'eco-id', name: 'test', ownerId: 'id', status: EcosystemStatus.ACTIVE });

    const result = await service.create({ name: 'test', latitude: 1, longitude: 2 }, 'id');

    expect(prismaMock.identity.create).toHaveBeenCalled();
    expect(prismaMock.ecosystem.create).toHaveBeenCalled();
    expect(result.name).toBe('test');
  });

  it('getApiKey should return decrypted api key for owner', async () => {
    const apiKey = 'AUR-TEST-KEY';
    const encrypted = service['encryptApiKey'](apiKey);
    prismaMock.ecosystem.findUnique.mockResolvedValue({
      id: 'eco-id',
      ownerId: 'actor-id',
      apiKey: encrypted.apiKeyCiphertext,
      apiKeyIv: encrypted.apiKeyIv,
      apiKeyAuthTag: encrypted.apiKeyAuthTag,
    });

    const result = await service.getApiKey('eco-id', 'actor-id');

    expect(result).toEqual({ ecosystemId: 'eco-id', apiKey });
  });

  it('getApiKey should throw ForbiddenException when owner mismatch', async () => {
    prismaMock.ecosystem.findUnique.mockResolvedValue({
      id: 'eco-id',
      ownerId: 'other-id',
      apiKey: 'cipher',
      apiKeyIv: 'iv',
      apiKeyAuthTag: 'tag',
    });

    await expect(service.getApiKey('eco-id', 'actor-id')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('validateApiKey should return valid true and update coordinates when matching', async () => {
    const apiKey = 'AUR-VALID-KEY';
    const encrypted = service['encryptApiKey'](apiKey);
    prismaMock.ecosystem.findMany.mockResolvedValue([
      {
        id: 'eco-id',
        status: EcosystemStatus.ACTIVE,
        apiKey: encrypted.apiKeyCiphertext,
        apiKeyIv: encrypted.apiKeyIv,
        apiKeyAuthTag: encrypted.apiKeyAuthTag,
      },
    ]);
    prismaMock.ecosystem.update.mockResolvedValue({ id: 'eco-id' });

    const result = await service.validateApiKey(apiKey, 1, 2);

    expect(result).toEqual({ valid: true, ecosystemId: 'eco-id' });
    expect(prismaMock.ecosystem.update).toHaveBeenCalled();
  });

  it('validateApiKey should return valid false when no matching key exists', async () => {
    prismaMock.ecosystem.findMany.mockResolvedValue([]);

    await expect(service.validateApiKey('AUR-NOT-FOUND', 1, 2)).resolves.toEqual({ valid: false });
  });

  it('signHash should return signature and publicKey for active ecosystem', async () => {
    prismaMock.ecosystem.findUnique.mockResolvedValue({
      id: 'eco-id',
      status: EcosystemStatus.ACTIVE,
      identity: {
        privateKeyCiphertext: 'cipher',
        privateKeyIv: 'iv',
        privateKeyAuthTag: 'tag',
        publicKey: 'pub-key',
      },
    });
    cryptoMock.decryptPrivateKey.mockReturnValue('private-key');
    cryptoMock.sign.mockReturnValue('signed-hash');

    const result = await service.signHash('eco-id', 'some-hash');

    expect(result).toEqual({ signature: 'signed-hash', publicKey: 'pub-key' });
  });

  it('updateHeartbeat should throw NotFoundException on P2025', async () => {
    const p2025Error = new Error('Not found') as Prisma.PrismaClientKnownRequestError;
    Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
    (p2025Error as any).code = 'P2025';
    prismaMock.ecosystem.update.mockRejectedValue(p2025Error);

    await expect(service.updateHeartbeat('eco-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});