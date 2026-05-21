import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DevicesService } from './devices.service';
import { ActionsAnchorService } from '../../blockchain/anchoring/actions-anchor.service';

describe('DevicesService', () => {
  let service: DevicesService;

  const prismaMock = {
    device: {
      create: jest.fn() as any,
      findMany: jest.fn() as any,
      findUnique: jest.fn() as any,
      update: jest.fn() as any,
      delete: jest.fn() as any,
    },
    ecosystem: {
      findUnique: jest.fn() as any,
    },
  };

  const anchoringMock = { anchorAction: jest.fn() as any };

  const createDto: CreateDeviceDto = {
    name: 'sensor-01',
    ecosystemId: '11111111-1111-4111-8111-111111111111',
  };

  const deviceSelect = {
    id: true,
    name: true,
    category: true,
    room: true,
    macAddress: true,
    vendor: true,
    ecosystemId: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        { provide: ActionsAnchorService, useValue: anchoringMock },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('persists device with default PENDING status', async () => {
      (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

      await service.create(createDto);

      expect(prismaMock.device.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          ecosystemId: createDto.ecosystemId,
          category: null,
          room: null,
          macAddress: null,
          vendor: null,
        },
        select: deviceSelect,
      });
    });

    it('normalizes raw macAddress before persisting', async () => {
      (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

      await service.create({
        ...createDto,
        macAddress: 'aa-bb-cc-dd-ee-ff',
      });

      expect(prismaMock.device.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          ecosystemId: createDto.ecosystemId,
          category: null,
          room: null,
          macAddress: 'AA:BB:CC:DD:EE:FF',
          vendor: null,
        },
        select: deviceSelect,
      });
    });

    it('anchors action when actorId is provided', async () => {
      (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id', name: 'sensor', ecosystemId: 'eco-id' });

      await service.create(createDto, 'actor-id');

      expect(anchoringMock.anchorAction).toHaveBeenCalledWith({
        actionType: 'DEVICE_REGISTER',
        actorId: 'actor-id',
        targetId: 'device-id',
        readableDescription: expect.stringContaining('sensor'),
        metadata: { deviceId: 'device-id', ecosystemId: 'eco-id' },
      });
    });

    it('does not anchor when actorId is missing', async () => {
      (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

      await service.create(createDto);

      expect(anchoringMock.anchorAction).not.toHaveBeenCalled();
    });
  });

  describe('normalizeMacAddress', () => {
    it('returns null for empty input', async () => {
      (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

      await service.create({ ...createDto, macAddress: '   ' });

      expect(prismaMock.device.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ macAddress: null }) }),
      );
    });

    it('throws for invalid MAC format', async () => {
      await expect(service.existsByMacAddress('eco-id', 'not-a-mac'))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws for empty MAC in required method', async () => {
      await expect(service.existsByMacAddress('eco-id', ''))
        .rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('existsByMacAddress', () => {
    it('returns true when device exists', async () => {
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

    it('returns false when device does not exist', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue(null);

      const result = await service.existsByMacAddress('eco-id', 'AA:BB:CC:DD:EE:FF');

      expect(result).toBe(false);
    });
  });

  describe('registerFromDiscovery', () => {
    it('creates a device when it does not exist', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue(null);
      (prismaMock.ecosystem.findUnique as any).mockResolvedValue({ id: 'eco-id', ownerId: 'owner-id' });
      (prismaMock.device.findMany as any).mockResolvedValue([]);
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
        select: deviceSelect,
      });
    });

    it('uses default name when no preferred name is provided', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue(null);
      (prismaMock.ecosystem.findUnique as any).mockResolvedValue({ id: 'eco-id', ownerId: 'owner-id' });
      (prismaMock.device.findMany as any).mockResolvedValue([]);
      (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

      await service.registerFromDiscovery('eco-id', 'aa-bb-cc-dd-ee-ff', 'Cisco');

      expect(prismaMock.device.create).toHaveBeenCalledWith({
        data: {
          ecosystemId: 'eco-id',
          name: 'Nuevo dispositivo 1',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          vendor: 'Cisco',
        },
        select: deviceSelect,
      });
    });

    it('returns existing device and preserves user-assigned name', async () => {
      const existingDevice = { id: 'existing-device-id', name: 'Nombre personalizado', vendor: 'Cisco' };
      (prismaMock.device.findUnique as any).mockResolvedValue(existingDevice);

      const result = await service.registerFromDiscovery('eco-id', 'AA:BB:CC:DD:EE:FF', 'Cisco', 'sensor-humedad-01');

      expect(prismaMock.device.create).not.toHaveBeenCalled();
      expect(prismaMock.device.update).not.toHaveBeenCalled();
      expect(result).toEqual(existingDevice);
    });

    it('updates vendor for existing device when vendor is discovered later', async () => {
      const existingDevice = { id: 'existing-device-id', vendor: '' };
      const updatedDevice = { id: 'existing-device-id', vendor: 'Cisco', name: 'Nombre personalizado' };
      (prismaMock.device.findUnique as any).mockResolvedValue(existingDevice);
      (prismaMock.device.update as any).mockResolvedValue(updatedDevice);

      const result = await service.registerFromDiscovery('eco-id', 'AA:BB:CC:DD:EE:FF', 'Cisco', 'sensor-humedad-01');

      expect(prismaMock.device.update).toHaveBeenCalledWith({
        where: { id: existingDevice.id },
        data: { vendor: 'Cisco' },
        select: deviceSelect,
      });
      expect(result).toEqual(updatedDevice);
    });

    it('uses fallback default name when ecosystem not found in generateNextDefaultName', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue(null);
      (prismaMock.ecosystem.findUnique as any).mockResolvedValue(null);
      (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

      await service.registerFromDiscovery('eco-id', 'aa-bb-cc-dd-ee-ff');

      expect(prismaMock.device.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Nuevo dispositivo 1' }) }),
      );
    });

    it('increments device number when devices with numbered names exist', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue(null);
      (prismaMock.ecosystem.findUnique as any).mockResolvedValue({ id: 'eco-id', ownerId: 'owner-id' });
      (prismaMock.device.findMany as any).mockResolvedValue([
        { name: 'Nuevo dispositivo 1' },
        { name: 'Nuevo dispositivo 3' },
        { name: 'Nuevo dispositivo 2' },
      ]);
      (prismaMock.device.create as any).mockResolvedValue({ id: 'device-id' });

      await service.registerFromDiscovery('eco-id', 'aa-bb-cc-dd-ee-ff');

      expect(prismaMock.device.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Nuevo dispositivo 4' }) }),
      );
    });
  });

  describe('updateVendorIfMissing', () => {
    it('returns null when vendor is empty', async () => {
      const result = await service.updateVendorIfMissing('eco-id', 'aa-bb-cc-dd-ee-ff', '');

      expect(result).toBeNull();
    });

    it('throws NotFoundException when device does not exist', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue(null);

      await expect(
        service.updateVendorIfMissing('eco-id', 'aa-bb-cc-dd-ee-ff', 'Cisco'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns existing device when vendor is already set and not Generic Device', async () => {
      const existingDevice = { id: 'device-id', vendor: 'Cisco' };
      (prismaMock.device.findUnique as any).mockResolvedValue(existingDevice);

      const result = await service.updateVendorIfMissing('eco-id', 'aa-bb-cc-dd-ee-ff', 'Other');

      expect(prismaMock.device.update).not.toHaveBeenCalled();
      expect(result).toEqual(existingDevice);
    });

    it('updates vendor when current is empty', async () => {
      const existingDevice = { id: 'device-id', vendor: '' };
      const updatedDevice = { id: 'device-id', vendor: 'Cisco' };
      (prismaMock.device.findUnique as any).mockResolvedValue(existingDevice);
      (prismaMock.device.update as any).mockResolvedValue(updatedDevice);

      const result = await service.updateVendorIfMissing('eco-id', 'aa-bb-cc-dd-ee-ff', 'Cisco');

      expect(prismaMock.device.update).toHaveBeenCalledWith({
        where: { id: 'device-id' },
        data: { vendor: 'Cisco' },
        select: deviceSelect,
      });
      expect(result).toEqual(updatedDevice);
    });

    it('updates vendor when current is Generic Device', async () => {
      const existingDevice = { id: 'device-id', vendor: 'Generic Device' };
      const updatedDevice = { id: 'device-id', vendor: 'Cisco' };
      (prismaMock.device.findUnique as any).mockResolvedValue(existingDevice);
      (prismaMock.device.update as any).mockResolvedValue(updatedDevice);

      const result = await service.updateVendorIfMissing('eco-id', 'aa-bb-cc-dd-ee-ff', 'Cisco');

      expect(prismaMock.device.update).toHaveBeenCalled();
      expect(result).toEqual(updatedDevice);
    });
  });

  describe('findAll', () => {
    it('delegates to prisma', async () => {
      (prismaMock.device.findMany as any).mockResolvedValue([{ id: 'device-id' }]);

      await service.findAll();

      expect(prismaMock.device.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        select: deviceSelect,
      });
    });
  });

  describe('findOne', () => {
    it('returns device when exists', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue({ id: 'device-id' });

      const result = await service.findOne('device-id');

      expect(prismaMock.device.findUnique).toHaveBeenCalled();
      expect(result).toEqual({ id: 'device-id' });
    });

    it('throws NotFoundException when missing', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOneForUser', () => {
    const mockDeviceData = {
      id: 'device-id',
      name: 'sensor',
      category: null,
      room: null,
      macAddress: 'AA:BB:CC:DD:EE:FF',
      vendor: null,
      ecosystemId: 'eco-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('returns device directly for admin users', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue(mockDeviceData);

      const result = await service.findOneForUser('device-id', 'user-id', Role.ADMIN);

      expect(result).toEqual(mockDeviceData);
    });

    it('returns device directly for global admin users', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue(mockDeviceData);

      const result = await service.findOneForUser('device-id', 'user-id', Role.GLOBAL_ADMIN);

      expect(result).toEqual(mockDeviceData);
    });

    it('returns device for user with ecosystem access', async () => {
      const deviceWithAccess = {
        ...mockDeviceData,
        ecosystem: {
          id: 'eco-id',
          ownerId: 'other-owner',
          accesses: [{ userId: 'user-id' }],
        },
      };
      (prismaMock.device.findUnique as any).mockResolvedValue(deviceWithAccess);

      const result = await service.findOneForUser('device-id', 'user-id', Role.USER);

      expect(result).not.toHaveProperty('ecosystem');
      expect(result.id).toBe('device-id');
    });

    it('returns device for ecosystem owner', async () => {
      const deviceWithAccess = {
        ...mockDeviceData,
        ecosystem: {
          id: 'eco-id',
          ownerId: 'user-id',
          accesses: [],
        },
      };
      (prismaMock.device.findUnique as any).mockResolvedValue(deviceWithAccess);

      const result = await service.findOneForUser('device-id', 'user-id', Role.USER);

      expect(result).not.toHaveProperty('ecosystem');
      expect(result.id).toBe('device-id');
    });

    it('throws NotFoundException for user without access', async () => {
      const deviceWithAccess = {
        ...mockDeviceData,
        ecosystem: {
          id: 'eco-id',
          ownerId: 'other-owner',
          accesses: [{ userId: 'other-user' }],
        },
      };
      (prismaMock.device.findUnique as any).mockResolvedValue(deviceWithAccess);

      await expect(
        service.findOneForUser('device-id', 'user-without-access', Role.USER),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when device missing', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue(null);

      await expect(
        service.findOneForUser('missing', 'user-id', Role.USER),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('maps P2025 to NotFoundException', async () => {
      const p2025Error = Object.assign(new Error('record not found'), { code: 'P2025' });
      Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
      (prismaMock.device.update as any).mockRejectedValue(p2025Error);

      await expect(service.update('missing', { name: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('maps unknown errors to InternalServerErrorException', async () => {
      (prismaMock.device.update as any).mockRejectedValue(new Error('db down'));

      await expect(service.update('device-id', { name: 'x' })).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('anchors action when actorId is provided', async () => {
      (prismaMock.device.update as any).mockResolvedValue({ id: 'device-id', name: 'sensor', ecosystemId: 'eco-id' });

      await service.update('device-id', { name: 'updated' }, 'actor-id');

      expect(anchoringMock.anchorAction).toHaveBeenCalledWith({
        actionType: 'DEVICE_UPDATE',
        actorId: 'actor-id',
        targetId: 'device-id',
        readableDescription: expect.stringContaining('sensor'),
        metadata: { deviceId: 'device-id', ecosystemId: 'eco-id' },
      });
    });

    it('normalizes macAddress when provided in update', async () => {
      (prismaMock.device.update as any).mockResolvedValue({ id: 'device-id' });

      await service.update('device-id', { macAddress: 'aa-bb-cc-dd-ee-ff' } as any);

      expect(prismaMock.device.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ macAddress: 'AA:BB:CC:DD:EE:FF' }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('maps P2025 to NotFoundException', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue({ id: 'device-id', name: 'sensor' });
      const p2025Error = Object.assign(new Error('record not found'), { code: 'P2025' });
      Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
      (prismaMock.device.delete as any).mockRejectedValue(p2025Error);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('maps unknown errors to InternalServerErrorException', async () => {
      (prismaMock.device.findUnique as any).mockResolvedValue({ id: 'device-id', name: 'sensor' });
      (prismaMock.device.delete as any).mockRejectedValue(new Error('db down'));

      await expect(service.remove('device-id')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('deletes device and returns its data on success', async () => {
      const deviceData = { id: 'device-id', name: 'sensor', ecosystemId: 'eco-id' };
      (prismaMock.device.findUnique as any).mockResolvedValue(deviceData);
      (prismaMock.device.delete as any).mockResolvedValue(deviceData);

      const result = await service.remove('device-id');

      expect(prismaMock.device.delete).toHaveBeenCalledWith({ where: { id: 'device-id' } });
      expect(result).toEqual(deviceData);
    });

    it('anchors action when actorId is provided', async () => {
      const deviceData = { id: 'device-id', name: 'sensor', ecosystemId: 'eco-id' };
      (prismaMock.device.findUnique as any).mockResolvedValue(deviceData);
      (prismaMock.device.delete as any).mockResolvedValue(deviceData);

      await service.remove('device-id', 'actor-id');

      expect(anchoringMock.anchorAction).toHaveBeenCalledWith({
        actionType: 'DEVICE_REMOVE',
        actorId: 'actor-id',
        targetId: 'device-id',
        readableDescription: expect.stringContaining('sensor'),
        metadata: { deviceId: 'device-id', ecosystemId: 'eco-id' },
      });
    });
  });
});
