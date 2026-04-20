import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { EcosystemsController } from './ecosystems.controller';
import { EcosystemsService } from './ecosystems.service';
import { CreateEcosystemDto } from './dto/create-ecosystem.dto';

describe('EcosystemsController', () => {
  let controller: EcosystemsController;

  const ecosystemsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateHeartbeat: jest.fn(),
    getApiKey: jest.fn(),
  };

  const userRequest = {
    user: {
      sub: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      role: Role.USER,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EcosystemsController],
      providers: [
        {
          provide: EcosystemsService,
          useValue: ecosystemsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<EcosystemsController>(EcosystemsController);
    jest.clearAllMocks();
    delete process.env.TEST_OWNER_ID;
  });

  it('create resolves owner from authenticated JWT subject', async () => {
    const dto: CreateEcosystemDto = { name: 'eco-1' };
    (ecosystemsServiceMock.create as any).mockResolvedValue({ id: 'eco-id' });

    await controller.create(dto, userRequest);

    expect(ecosystemsServiceMock.create).toHaveBeenCalledWith(dto, userRequest.user.sub);
  });

  it('create forwards the full dto to service', async () => {
    const dto: CreateEcosystemDto = {
      name: 'eco-2',
      latitude: 40.4168,
      longitude: -3.7038,
    };

    await controller.create(dto, userRequest);

    expect(ecosystemsServiceMock.create).toHaveBeenCalledWith(dto, userRequest.user.sub);
  });

  it('getApiKey delegates ecosystem ownership check to service', async () => {
    (ecosystemsServiceMock.getApiKey as any).mockResolvedValue({ ecosystemId: 'eco-id', apiKey: 'AUR-KEY' });

    await controller.getApiKey('eco-id', userRequest);

    expect(ecosystemsServiceMock.getApiKey).toHaveBeenCalledWith('eco-id', userRequest.user.sub);
  });

  it('routes read/write methods to service', async () => {
    (ecosystemsServiceMock.findAll as any).mockResolvedValue([]);
    (ecosystemsServiceMock.findOne as any).mockResolvedValue({ id: 'eco' });
    (ecosystemsServiceMock.update as any).mockResolvedValue({ id: 'eco', name: 'new' });
    (ecosystemsServiceMock.updateHeartbeat as any).mockResolvedValue({ id: 'eco', isOnline: true });
    (ecosystemsServiceMock.remove as any).mockResolvedValue({ id: 'eco' });

    await controller.findAll();
    await controller.findOne('eco');
    await controller.update('eco', {});
    await controller.updateHeartbeat('eco');
    await controller.remove('eco');

    expect(ecosystemsServiceMock.findAll).toHaveBeenCalled();
    expect(ecosystemsServiceMock.findOne).toHaveBeenCalledWith('eco');
    expect(ecosystemsServiceMock.update).toHaveBeenCalledWith('eco', {});
    expect(ecosystemsServiceMock.updateHeartbeat).toHaveBeenCalledWith('eco');
    expect(ecosystemsServiceMock.remove).toHaveBeenCalledWith('eco');
  });
});
