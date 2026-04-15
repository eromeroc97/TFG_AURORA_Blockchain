import { ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EcosystemStatus, Prisma } from '@prisma/client';
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
    ownerId: '11111111-1111-4111-8111-111111111111',
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
  });

  it('create persists ecosystem with ACTIVE status and child identity', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: createDto.ownerId,
      role: 'USER',
      did: 'did:firefly:custom/user@uclm.es',
    });
    (fireflyMock.createChildIdentity as any).mockResolvedValue('did:firefly:custom/eco-gateway');
    (prismaMock.ecosystem.create as any).mockResolvedValue({ id: 'eco-id' });

    await service.create(createDto);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: createDto.ownerId },
      select: { id: true, role: true, did: true },
    });
    expect(fireflyMock.createChildIdentity).toHaveBeenCalledWith({
      name: 'eco-gateway',
      parentDid: 'did:firefly:custom/user@uclm.es',
    });

    expect(prismaMock.ecosystem.create).toHaveBeenCalledWith({
      data: {
        name: 'eco-gateway',
        ownerId: createDto.ownerId,
        did: 'did:firefly:custom/eco-gateway',
        status: EcosystemStatus.ACTIVE,
        latitude: 40.4168,
        longitude: -3.7038,
      },
    });
  });

  it('create throws NotFoundException when owner does not exist', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(NotFoundException);
    expect(fireflyMock.createChildIdentity).not.toHaveBeenCalled();
    expect(prismaMock.ecosystem.create).not.toHaveBeenCalled();
  });

  it('create throws ForbiddenException when owner role is not USER', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: createDto.ownerId,
      role: 'ADMIN',
      did: 'did:firefly:custom/admin@uclm.es',
    });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(fireflyMock.createChildIdentity).not.toHaveBeenCalled();
    expect(prismaMock.ecosystem.create).not.toHaveBeenCalled();
  });

  it('create throws ForbiddenException when owner has no DID', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: createDto.ownerId,
      role: 'USER',
      did: null,
    });

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(fireflyMock.createChildIdentity).not.toHaveBeenCalled();
    expect(prismaMock.ecosystem.create).not.toHaveBeenCalled();
  });

  it('create throws InternalServerErrorException on failure', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: createDto.ownerId,
      role: 'USER',
      did: 'did:firefly:custom/user@uclm.es',
    });
    (fireflyMock.createChildIdentity as any).mockRejectedValue(new Error('firefly down'));

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
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
    });
    expect(prismaMock.ecosystem.findUnique).toHaveBeenCalledWith({ where: { id: '2' } });
    expect(prismaMock.ecosystem.update).toHaveBeenCalledWith({ where: { id: '3' }, data: {} });
    expect(prismaMock.ecosystem.delete).toHaveBeenCalledWith({ where: { id: '4' } });
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
