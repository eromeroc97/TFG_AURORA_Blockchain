import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
    ecosystem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const fireflyMock = {
    getOrganizationDid: jest.fn(),
  };

  const createDto: CreateEcosystemDto = {
    name: 'eco-gateway',
    latitude: 40.4168,
    longitude: -3.7038,
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

  it('create persists ecosystem with ACTIVE status and organization did', async () => {
    (fireflyMock.getOrganizationDid as any).mockResolvedValue('did:firefly:org/demo');
    (prismaMock.ecosystem.create as any).mockResolvedValue({ id: 'eco-id' });

    await service.create(createDto, 'owner-id');

    expect(prismaMock.ecosystem.create).toHaveBeenCalledWith({
      data: {
        name: 'eco-gateway',
        ownerId: 'owner-id',
        did: 'did:firefly:org/demo',
        status: EcosystemStatus.ACTIVE,
        latitude: 40.4168,
        longitude: -3.7038,
      },
    });
  });

  it('create throws InternalServerErrorException on failure', async () => {
    (fireflyMock.getOrganizationDid as any).mockRejectedValue(new Error('firefly down'));

    await expect(service.create(createDto, 'owner-id')).rejects.toBeInstanceOf(
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
