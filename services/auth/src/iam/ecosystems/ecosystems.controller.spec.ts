import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
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

  it('create uses dto ownerId when provided', async () => {
    const dto: CreateEcosystemDto = { name: 'eco-1', ownerId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' };
    (ecosystemsServiceMock.create as any).mockResolvedValue({ id: 'eco-id' });

    await controller.create(dto);

    expect(ecosystemsServiceMock.create).toHaveBeenCalledWith(
      dto,
      'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    );
  });

  it('create uses TEST_OWNER_ID when ownerId is absent', async () => {
    process.env.TEST_OWNER_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
    const dto: CreateEcosystemDto = { name: 'eco-2' };

    await controller.create(dto);

    expect(ecosystemsServiceMock.create).toHaveBeenCalledWith(
      dto,
      'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    );
  });

  it('create uses static fallback ownerId when both ownerId and TEST_OWNER_ID are absent', async () => {
    const dto: CreateEcosystemDto = { name: 'eco-3' };

    await controller.create(dto);

    expect(ecosystemsServiceMock.create).toHaveBeenCalledWith(
      dto,
      '11111111-1111-1111-1111-111111111111',
    );
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
