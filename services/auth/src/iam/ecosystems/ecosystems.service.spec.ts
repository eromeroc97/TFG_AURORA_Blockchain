import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createCipheriv, randomBytes } from 'crypto';
import { EcosystemStatus, IdentityType, Role, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FireflyService } from '../../blockchain/firefly.service';
import { CryptoService } from '../../crypto/crypto.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEcosystemDto } from './dto/create-ecosystem.dto';
import { EcosystemsService } from './ecosystems.service';

describe('EcosystemsService', () => {
  let service: EcosystemsService;
  const keyBuffer = Buffer.alloc(32, 7);

  const prismaMock = {
    user: { findUnique: jest.fn<() => Promise<any>>() },
    identity: { create: jest.fn<() => Promise<any>>() },
    ecosystem: { create: jest.fn<() => Promise<any>>(), findUnique: jest.fn<() => Promise<any>>(), update: jest.fn<() => Promise<any>>() },
  };

  const fireflyMock = { broadcastAnchor: jest.fn() };
  const cryptoMock = { generateKeyPair: jest.fn(), encryptPrivateKey: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EcosystemsService, { provide: PrismaService, useValue: prismaMock }, { provide: FireflyService, useValue: fireflyMock }, { provide: CryptoService, useValue: cryptoMock }],
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
});