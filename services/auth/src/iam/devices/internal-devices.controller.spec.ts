import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InternalDevicesController } from './internal-devices.controller';
import { DevicesService } from './devices.service';

describe('InternalDevicesController', () => {
  let controller: InternalDevicesController;

  const devicesServiceMock = {
    existsByMacAddress: jest.fn(),
    registerFromDiscovery: jest.fn(),
    updateVendorIfMissing: jest.fn(),
  };

  beforeEach(async () => {
    process.env.AUTH_INTERNAL_TOKEN = 'internal-token';

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalDevicesController],
      providers: [
        {
          provide: DevicesService,
          useValue: devicesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<InternalDevicesController>(InternalDevicesController);
    jest.clearAllMocks();
  });

  it('forwards existence checks when the internal token matches', async () => {
    (devicesServiceMock.existsByMacAddress as any).mockResolvedValue(true);

    const result = await controller.exists('Bearer internal-token', {
      ecosystemId: '11111111-1111-1111-1111-111111111111',
      macAddress: 'AA:BB:CC:DD:EE:FF',
    });

    expect(devicesServiceMock.existsByMacAddress).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'AA:BB:CC:DD:EE:FF',
    );
    expect(result).toEqual({ exists: true });
  });

  it('forbids access with an invalid internal token', async () => {
    await expect(
      controller.exists('Bearer wrong-token', {
        ecosystemId: '11111111-1111-1111-1111-111111111111',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('registers devices from discovery when the internal token matches', async () => {
    (devicesServiceMock.registerFromDiscovery as any).mockResolvedValue({ id: 'device-id' });

    const result = await controller.register('Bearer internal-token', {
      ecosystemId: '11111111-1111-1111-1111-111111111111',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      vendor: 'Cisco',
      preferredName: 'sensor-humedad-01',
    });

    expect(devicesServiceMock.registerFromDiscovery).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'AA:BB:CC:DD:EE:FF',
      'Cisco',
      'sensor-humedad-01',
    );
    expect(result).toEqual({ success: true });
  });

  it('rejects register requests with missing macAddress', async () => {
    await expect(
      controller.register('Bearer internal-token', {
        ecosystemId: '11111111-1111-1111-1111-111111111111',
        macAddress: '',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates vendor through the internal vendor endpoint when the internal token matches', async () => {
    (devicesServiceMock.updateVendorIfMissing as any).mockResolvedValue({ id: 'device-id' });

    const result = await controller.updateVendor('Bearer internal-token', {
      ecosystemId: '11111111-1111-1111-1111-111111111111',
      macAddress: 'AA:BB:CC:DD:EE:FF',
      vendor: 'Cisco',
    });

    expect(devicesServiceMock.updateVendorIfMissing).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'AA:BB:CC:DD:EE:FF',
      'Cisco',
    );
    expect(result).toEqual({ success: true });
  });

  it('rejects vendor update requests with missing vendor', async () => {
    await expect(
      controller.updateVendor('Bearer internal-token', {
        ecosystemId: '11111111-1111-1111-1111-111111111111',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        vendor: '',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
