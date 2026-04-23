import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DevicesService } from './devices.service';

describe('DevicesService', () => {
  let service: DevicesService;

  const prismaMock = {
    device: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const createDto: CreateDeviceDto = {
    name: 'sensor-01',
    ecosystemId: '11111111-1111-4111-8111-111111111111',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    jest.clearAllMocks();
  });

  it('create persists device with default PENDING status', async () => {
    (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

    await service.create(createDto);

    expect(prismaMock.device.create).toHaveBeenCalledWith({
      data: {
        name: createDto.name,
        ecosystemId: createDto.ecosystemId,
        macAddress: null,
        vendor: null,
      },
      select: {
        id: true,
        name: true,
        macAddress: true,
        vendor: true,
        ecosystemId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('create normalizes raw macAddress before persisting', async () => {
    (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

    await service.create({
      ...createDto,
      macAddress: 'aa-bb-cc-dd-ee-ff',
    });

    expect(prismaMock.device.create).toHaveBeenCalledWith({
      data: {
        name: createDto.name,
        ecosystemId: createDto.ecosystemId,
        macAddress: 'AA:BB:CC:DD:EE:FF',
        vendor: null,
      },
      select: {
        id: true,
        name: true,
        macAddress: true,
        vendor: true,
        ecosystemId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('existsByMacAddress returns true when device exists', async () => {
    (prismaMock.device.findUnique as any).mockResolvedValue({ id: 'device-id' });

    const result = await service.existsByMacAddress('eco-id', 'aa-bb-cc-dd-ee-ff');

    expect(prismaMock.device.findUnique).toHaveBeenCalledWith({
      where: {
        ecosystemId_macAddress: {
          ecosystemId: 'eco-id',
          macAddress: 'AA:BB:CC:DD:EE:FF',
        },
      },
      select: { id: true },
    });
    expect(result).toBe(true);
  });

  it('existsByMacAddress returns false when device does not exist', async () => {
    (prismaMock.device.findUnique as any).mockResolvedValue(null);

    const result = await service.existsByMacAddress('eco-id', 'AA:BB:CC:DD:EE:FF');

    expect(result).toBe(false);
  });

  it('registerFromDiscovery creates a device when it does not exist', async () => {
    (prismaMock.device.findUnique as any).mockResolvedValue(null);
    (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

    await service.registerFromDiscovery('eco-id', 'aa-bb-cc-dd-ee-ff', 'Cisco', 'sensor-humedad-01');

    expect(prismaMock.device.findUnique).toHaveBeenCalledWith({
      where: {
        ecosystemId_macAddress: {
          ecosystemId: 'eco-id',
          macAddress: 'AA:BB:CC:DD:EE:FF',
        },
      },
      select: { id: true, vendor: true },
    });
    expect(prismaMock.device.create).toHaveBeenCalledWith({
      data: {
        ecosystemId: 'eco-id',
        name: 'sensor-humedad-01',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        vendor: 'Cisco',
      },
      select: {
        id: true,
        name: true,
        macAddress: true,
        vendor: true,
        ecosystemId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('registerFromDiscovery uses the default name when no preferred name is provided', async () => {
    (prismaMock.device.findUnique as any).mockResolvedValue(null);
    (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

    await service.registerFromDiscovery('eco-id', 'aa-bb-cc-dd-ee-ff', 'Cisco');

    expect(prismaMock.device.create).toHaveBeenCalledWith({
      data: {
        ecosystemId: 'eco-id',
        name: 'Nuevo dispositivo',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        vendor: 'Cisco',
      },
      select: {
        id: true,
        name: true,
        macAddress: true,
        vendor: true,
        ecosystemId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('registerFromDiscovery returns existing device and preserves user-assigned name when it already exists', async () => {
    const existingDevice = { id: 'existing-device-id', name: 'Nombre personalizado', vendor: 'Cisco' };
    (prismaMock.device.findUnique as any).mockResolvedValue(existingDevice);

    const result = await service.registerFromDiscovery('eco-id', 'AA:BB:CC:DD:EE:FF', 'Cisco', 'sensor-humedad-01');

    expect(prismaMock.device.create).not.toHaveBeenCalled();
    expect(prismaMock.device.update).not.toHaveBeenCalled();
    expect(result).toEqual(existingDevice);
  });

  it('registerFromDiscovery updates vendor for existing device when vendor is discovered later', async () => {
    const existingDevice = { id: 'existing-device-id', vendor: null };
    const updatedDevice = { id: 'existing-device-id', vendor: 'Cisco', name: 'Nombre personalizado' };
    (prismaMock.device.findUnique as any).mockResolvedValue(existingDevice);
    (prismaMock.device.update as any).mockResolvedValue(updatedDevice);

    const result = await service.registerFromDiscovery('eco-id', 'AA:BB:CC:DD:EE:FF', 'Cisco', 'sensor-humedad-01');

    expect(prismaMock.device.update).toHaveBeenCalledWith({
      where: { id: existingDevice.id },
      data: { vendor: 'Cisco' },
      select: {
        id: true,
        name: true,
        macAddress: true,
        vendor: true,
        ecosystemId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual(updatedDevice);
  });

  it('delegates findAll to prisma', async () => {
    (prismaMock.device.findMany as any).mockResolvedValue([{ id: 'device-id' }]);

    await service.findAll();

    expect(prismaMock.device.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        macAddress: true,
        vendor: true,
        ecosystemId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('findOne returns device when exists', async () => {
    (prismaMock.device.findUnique as any).mockResolvedValue({ id: 'device-id' });

    const result = await service.findOne('device-id');

    expect(prismaMock.device.findUnique).toHaveBeenCalled();
    expect(result).toEqual({ id: 'device-id' });
  });

  it('findOne throws NotFoundException when missing', async () => {
    (prismaMock.device.findUnique as any).mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update maps P2025 to NotFoundException', async () => {
    const p2025Error = Object.assign(new Error('record not found'), { code: 'P2025' });
    Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
    (prismaMock.device.update as any).mockRejectedValue(p2025Error);

    await expect(service.update('missing', { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update maps unknown errors to InternalServerErrorException', async () => {
    (prismaMock.device.update as any).mockRejectedValue(new Error('db down'));

    await expect(service.update('device-id', { name: 'x' })).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('remove maps P2025 to NotFoundException', async () => {
    const p2025Error = Object.assign(new Error('record not found'), { code: 'P2025' });
    Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
    (prismaMock.device.delete as any).mockRejectedValue(p2025Error);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove maps unknown errors to InternalServerErrorException', async () => {
    (prismaMock.device.delete as any).mockRejectedValue(new Error('db down'));

    await expect(service.remove('device-id')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});