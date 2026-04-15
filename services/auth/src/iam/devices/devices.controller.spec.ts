import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { DeviceStatus } from '@prisma/client';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

describe('DevicesController', () => {
  let controller: DevicesController;
  let devicesService: {
    create: ReturnType<typeof jest.fn>;
    findAll: ReturnType<typeof jest.fn>;
    findOne: ReturnType<typeof jest.fn>;
    update: ReturnType<typeof jest.fn>;
    remove: ReturnType<typeof jest.fn>;
  };

  const devicesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(() => []),
    findOne: jest.fn((id: string) => ({ id })),
    update: jest.fn((id: string, dto: UpdateDeviceDto) => ({ id, ...dto })),
    remove: jest.fn((id: string) => ({ id })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [
        {
          provide: DevicesService,
          useValue: devicesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<DevicesController>(DevicesController);
    devicesService = module.get(DevicesService) as unknown as typeof devicesService;
    jest.clearAllMocks();
  });

  it('create should call DevicesService.create', async () => {
    const dto: CreateDeviceDto = {
      name: 'sensor-1',
      fingerprint: 'AA:BB:CC:DD:EE:FF',
      ecosystemId: '11111111-1111-4111-8111-111111111111',
      status: DeviceStatus.PENDING,
    };

    await controller.create(dto);

    expect(devicesService.create).toHaveBeenCalledWith(dto);
  });

  it('findAll should call DevicesService.findAll', async () => {
    await controller.findAll();
    expect(devicesService.findAll).toHaveBeenCalled();
  });

  it('findOne should call DevicesService.findOne', async () => {
    await controller.findOne('22222222-2222-4222-8222-222222222222');
    expect(devicesService.findOne).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222');
  });

  it('update should call DevicesService.update', async () => {
    const dto: UpdateDeviceDto = { name: 'sensor-updated' };
    await controller.update('33333333-3333-4333-8333-333333333333', dto);

    expect(devicesService.update).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333',
      dto,
    );
  });

  it('remove should call DevicesService.remove', async () => {
    await controller.remove('44444444-4444-4444-8444-444444444444');
    expect(devicesService.remove).toHaveBeenCalledWith('44444444-4444-4444-8444-444444444444');
  });
});