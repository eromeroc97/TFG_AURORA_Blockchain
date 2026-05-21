import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { EcosystemsController } from './ecosystems.controller';
import { EcosystemsService } from './ecosystems.service';

describe('EcosystemsController', () => {
  let controller: EcosystemsController;

  const ecosystemsServiceMock = {
    create: jest.fn() as any,
    findAll: jest.fn() as any,
    findOne: jest.fn() as any,
    findOneWithAccessCheck: jest.fn() as any,
    findDevicesForEcosystem: jest.fn() as any,
    findDevicesForEcosystemWithAccessCheck: jest.fn() as any,
    update: jest.fn() as any,
    remove: jest.fn() as any,
    updateHeartbeat: jest.fn() as any,
    getApiKey: jest.fn() as any,
    getEcosystemsWithAccessType: jest.fn() as any,
    getSharedWithMe: jest.fn() as any,
    getMyEcosystems: jest.fn() as any,
    getEcosystemsByUserId: jest.fn() as any,
    grantAccess: jest.fn() as any,
    getEcosystemAccesses: jest.fn() as any,
    revokeAccess: jest.fn() as any,
    updateAccessRole: jest.fn() as any,
    leaveSharedEcosystem: jest.fn() as any,
    getUserAccesses: jest.fn() as any,
    findAllEcosystemsByUserId: jest.fn() as any,
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
  });

  it('create resolves owner from authenticated JWT subject', async () => {
    const dto = { name: 'eco-1' };
    (ecosystemsServiceMock.create as any).mockResolvedValue({ id: 'eco-id' });

    await controller.create(dto as any, userRequest);

    expect(ecosystemsServiceMock.create).toHaveBeenCalledWith(dto, userRequest.user.sub);
  });

  it('getApiKey delegates ecosystem ownership check to service', async () => {
    (ecosystemsServiceMock.getApiKey as any).mockResolvedValue({ ecosystemId: 'eco-id', apiKey: 'AUR-KEY' });

    await controller.getApiKey('eco-id', userRequest);

    expect(ecosystemsServiceMock.getApiKey).toHaveBeenCalledWith('eco-id', userRequest.user.sub);
  });

  it('routes read/write methods to service', async () => {
    (ecosystemsServiceMock.getEcosystemsWithAccessType as any).mockResolvedValue([]);
    (ecosystemsServiceMock.findOneWithAccessCheck as any).mockResolvedValue({ id: 'eco' });
    (ecosystemsServiceMock.findDevicesForEcosystemWithAccessCheck as any).mockResolvedValue([]);
    (ecosystemsServiceMock.update as any).mockResolvedValue({ id: 'eco', name: 'new' });
    (ecosystemsServiceMock.updateHeartbeat as any).mockResolvedValue({ id: 'eco', isOnline: true });
    (ecosystemsServiceMock.remove as any).mockResolvedValue({ id: 'eco' });

    await controller.findAll(userRequest as any);
    await controller.findDevices('eco', userRequest);
    await controller.findOne('eco', userRequest);
    await controller.update('eco', {} as any, userRequest);
    await controller.updateHeartbeat('eco');
    await controller.remove('eco', userRequest);

    expect(ecosystemsServiceMock.getEcosystemsWithAccessType).toHaveBeenCalledWith(userRequest.user.sub, userRequest.user.role);
    expect(ecosystemsServiceMock.findDevicesForEcosystemWithAccessCheck).toHaveBeenCalledWith('eco', userRequest.user.sub, userRequest.user.role);
    expect(ecosystemsServiceMock.findOneWithAccessCheck).toHaveBeenCalledWith('eco', userRequest.user.sub, userRequest.user.role);
    expect(ecosystemsServiceMock.update).toHaveBeenCalledWith('eco', {}, userRequest.user.sub);
    expect(ecosystemsServiceMock.updateHeartbeat).toHaveBeenCalledWith('eco');
    expect(ecosystemsServiceMock.remove).toHaveBeenCalledWith('eco', userRequest.user.sub);
  });

  it('routes revoke endpoint to service remove with auth subject', async () => {
    (ecosystemsServiceMock.remove as any).mockResolvedValue({ id: 'eco' });

    await controller.revoke('eco', userRequest);

    expect(ecosystemsServiceMock.remove).toHaveBeenCalledWith('eco', userRequest.user.sub);
  });

  it('getSharedWithMe routes to getUserAccesses', async () => {
    (ecosystemsServiceMock.getUserAccesses as any).mockResolvedValue([]);

    await controller.getSharedWithMe(userRequest);

    expect(ecosystemsServiceMock.getUserAccesses).toHaveBeenCalledWith(userRequest.user.sub);
  });

  it('getMyEcosystems routes to getEcosystemsWithAccessType', async () => {
    (ecosystemsServiceMock.getEcosystemsWithAccessType as any).mockResolvedValue([]);

    await controller.getMyEcosystems(userRequest);

    expect(ecosystemsServiceMock.getEcosystemsWithAccessType).toHaveBeenCalledWith(userRequest.user.sub, userRequest.user.role);
  });

  it('getEcosystemsByUserId routes to findAllEcosystemsByUserId', async () => {
    (ecosystemsServiceMock.findAllEcosystemsByUserId as any).mockResolvedValue([{ id: 'eco-1' }]);

    await controller.getEcosystemsByUserId('user-1');

    expect(ecosystemsServiceMock.findAllEcosystemsByUserId).toHaveBeenCalledWith('user-1');
  });

  it('grantAccess routes to service', async () => {
    (ecosystemsServiceMock.grantAccess as any).mockResolvedValue(undefined);

    await controller.grantAccess('eco-1', { email: 'user@test.com' } as any, userRequest);

    expect(ecosystemsServiceMock.grantAccess).toHaveBeenCalledWith('eco-1', userRequest.user.sub, 'user@test.com', undefined);
  });

  it('getAccesses routes to getEcosystemAccesses', async () => {
    await controller.getAccesses('eco-1', userRequest);
    expect(ecosystemsServiceMock.getEcosystemAccesses).toHaveBeenCalledWith('eco-1', userRequest.user.sub);
  });

  it('revokeAccess routes to service', async () => {
    await controller.revokeAccess('eco-1', 'target-1', userRequest);
    expect(ecosystemsServiceMock.revokeAccess).toHaveBeenCalledWith('eco-1', userRequest.user.sub, 'target-1');
  });

  it('updateAccessRole routes to service', async () => {
    await controller.updateAccessRole('eco-1', 'target-1', { role: 'EDITOR' } as any, userRequest);
    expect(ecosystemsServiceMock.updateAccessRole).toHaveBeenCalledWith('eco-1', userRequest.user.sub, 'target-1', 'EDITOR');
  });

  it('leaveSharedEcosystem routes to service', async () => {
    await controller.leaveSharedEcosystem('eco-1', userRequest);
    expect(ecosystemsServiceMock.leaveSharedEcosystem).toHaveBeenCalledWith('eco-1', userRequest.user.sub);
  });
});
