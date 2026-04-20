import { ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createCipheriv, randomBytes } from 'crypto';
import { EcosystemStatus, Prisma, Role, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FireflyService } from '../../blockchain/firefly.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEcosystemDto } from './dto/create-ecosystem.dto';
import { EcosystemsService } from './ecosystems.service';

describe('EcosystemsService', () => {
  let service: EcosystemsService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    ecosystem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const fireflyMock = {
    createChildIdentity: jest.fn(),
  };

  const createDto: CreateEcosystemDto = {
    name: 'eco-gateway',
    latitude: 40.4168,
    longitude: -3.7038,
  };

  const actorId = '11111111-1111-4111-8111-111111111111';
  const keyBuffer = Buffer.alloc(32, 7);

  const encryptApiKeyForTest = (apiKey: string) => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);
    const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      apiKey: ciphertext.toString('base64'),
      apiKeyIv: iv.toString('base64'),
      apiKeyAuthTag: authTag.toString('base64'),
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EcosystemsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: FireflyService,
          useValue: fireflyMock,
        },
      ],
    }).compile();

    service = module.get<EcosystemsService>(EcosystemsService);
    jest.clearAllMocks();
    process.env.API_KEY_ENCRYPTION_KEY = keyBuffer.toString('base64');
  });

  it('create persists ecosystem with ACTIVE status, child identity and encrypted API key', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: actorId,
      role: Role.USER,
      status: UserStatus.ACTIVE,
      isActive: true,
      did: 'did:firefly:custom/user@test.test',
    });
    (fireflyMock.createChildIdentity as any).mockResolvedValue('did:firefly:custom/eco-gateway');
    (prismaMock.ecosystem.create as any).mockResolvedValue({
      id: 'eco-id',
      name: createDto.name,
      ownerId: actorId,
      did: 'did:firefly:custom/eco-gateway',
      certificateFingerprint: null,
      status: EcosystemStatus.ACTIVE,
      latitude: createDto.latitude,
      longitude: createDto.longitude,
      isOnline: false,
      lastSeen: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(createDto, actorId);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: actorId },
      select: { id: true, role: true, status: true, isActive: true, did: true },
    });
    expect(fireflyMock.createChildIdentity).toHaveBeenCalledWith({
      name: 'eco-gateway',
      parentDid: 'did:firefly:custom/user@test.test',
    });

    expect(prismaMock.ecosystem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'eco-gateway',
          ownerId: actorId,
          did: 'did:firefly:custom/eco-gateway',
          status: EcosystemStatus.ACTIVE,
          latitude: 40.4168,
          longitude: -3.7038,
          apiKey: expect.any(String),
          apiKeyIv: expect.any(String),
          apiKeyAuthTag: expect.any(String),
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ id: 'eco-id', apiKey: expect.stringMatching(/^AUR-/) }));
  });

  it('create throws ForbiddenException when JWT subject is missing', async () => {
    await expect(service.create(createDto, undefined)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('create throws NotFoundException when owner does not exist', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue(null);

    await expect(service.create(createDto, actorId)).rejects.toBeInstanceOf(NotFoundException);
    expect(fireflyMock.createChildIdentity).not.toHaveBeenCalled();
    expect(prismaMock.ecosystem.create).not.toHaveBeenCalled();
  });

  it('create throws ForbiddenException when owner role is not USER', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: actorId,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      did: 'did:firefly:custom/admin@test.test',
    });

    await expect(service.create(createDto, actorId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(fireflyMock.createChildIdentity).not.toHaveBeenCalled();
    expect(prismaMock.ecosystem.create).not.toHaveBeenCalled();
  });

  it('create throws ForbiddenException when owner is not ACTIVE/isActive', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: actorId,
      role: Role.USER,
      status: UserStatus.PASSBLOCK,
      isActive: true,
      did: 'did:firefly:custom/user@test.test',
    });

    await expect(service.create(createDto, actorId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(fireflyMock.createChildIdentity).not.toHaveBeenCalled();
    expect(prismaMock.ecosystem.create).not.toHaveBeenCalled();
  });

  it('create throws ForbiddenException when owner has no DID', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: actorId,
      role: Role.USER,
      status: UserStatus.ACTIVE,
      isActive: true,
      did: null,
    });

    await expect(service.create(createDto, actorId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(fireflyMock.createChildIdentity).not.toHaveBeenCalled();
    expect(prismaMock.ecosystem.create).not.toHaveBeenCalled();
  });

  it('create throws InternalServerErrorException on failure', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: actorId,
      role: Role.USER,
      status: UserStatus.ACTIVE,
      isActive: true,
      did: 'did:firefly:custom/user@test.test',
    });
    (fireflyMock.createChildIdentity as any).mockRejectedValue(new Error('firefly down'));

    await expect(service.create(createDto, actorId)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('getApiKey returns decrypted key for ecosystem owner', async () => {
    const rawApiKey = 'AUR-TEST-API-KEY-123';
    const encrypted = encryptApiKeyForTest(rawApiKey);

    (prismaMock.ecosystem.findUnique as any).mockResolvedValue({
      id: 'eco-id',
      ownerId: actorId,
      apiKey: encrypted.apiKey,
      apiKeyIv: encrypted.apiKeyIv,
      apiKeyAuthTag: encrypted.apiKeyAuthTag,
    });

    const result = await service.getApiKey('eco-id', actorId);

    expect(result).toEqual({ ecosystemId: 'eco-id', apiKey: rawApiKey });
  });

  it('getApiKey throws ForbiddenException for non-owner user', async () => {
    (prismaMock.ecosystem.findUnique as any).mockResolvedValue({
      id: 'eco-id',
      ownerId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
      apiKey: 'cipher',
      apiKeyIv: 'iv',
      apiKeyAuthTag: 'tag',
    });

    await expect(service.getApiKey('eco-id', actorId)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('getApiKey throws NotFoundException when key fields are missing', async () => {
    (prismaMock.ecosystem.findUnique as any).mockResolvedValue({
      id: 'eco-id',
      ownerId: actorId,
      apiKey: null,
      apiKeyIv: null,
      apiKeyAuthTag: null,
    });

    await expect(service.getApiKey('eco-id', actorId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delegates findAll/findOne/update/remove to prisma', async () => {
    (prismaMock.ecosystem.findMany as any).mockResolvedValue([{ id: '1' }]);
    (prismaMock.ecosystem.findUnique as any).mockResolvedValue({ id: '2' });
    (prismaMock.ecosystem.update as any).mockResolvedValue({ id: '3' });
    (prismaMock.ecosystem.delete as any).mockResolvedValue({ id: '4' });

    await service.findAll();
    await service.findOne('2');
    await service.update('3', {});
    await service.remove('4');

    expect(prismaMock.ecosystem.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      select: expect.any(Object),
    });
    expect(prismaMock.ecosystem.findUnique).toHaveBeenCalledWith({
      where: { id: '2' },
      select: expect.any(Object),
    });
    expect(prismaMock.ecosystem.update).toHaveBeenCalledWith({
      where: { id: '3' },
      data: {},
      select: expect.any(Object),
    });
    expect(prismaMock.ecosystem.delete).toHaveBeenCalledWith({
      where: { id: '4' },
      select: expect.any(Object),
    });
  });

  it('updateHeartbeat marks ecosystem online and sets lastSeen', async () => {
    (prismaMock.ecosystem.update as any).mockResolvedValue({ id: 'eco', isOnline: true });

    await service.updateHeartbeat('eco');

    expect(prismaMock.ecosystem.update).toHaveBeenCalledWith({
      where: { id: 'eco' },
      data: {
        isOnline: true,
        lastSeen: expect.any(Date),
      },
      select: expect.any(Object),
    });
  });

  it('updateHeartbeat maps P2025 to NotFoundException', async () => {
    const p2025Error = Object.assign(new Error('record not found'), { code: 'P2025' });
    Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
    (prismaMock.ecosystem.update as any).mockRejectedValue(p2025Error);

    await expect(service.updateHeartbeat('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateHeartbeat maps unknown errors to InternalServerErrorException', async () => {
    (prismaMock.ecosystem.update as any).mockRejectedValue(new Error('db down'));

    await expect(service.updateHeartbeat('eco')).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

