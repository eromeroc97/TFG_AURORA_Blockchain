import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InternalUsersController } from './internal-ecosystems.controller';
import { EcosystemsService } from './ecosystems.service';

describe('InternalUsersController', () => {
  let controller: InternalUsersController;

  const ecosystemsServiceMock = {
    validateApiKey: jest.fn() as any,
    signHash: jest.fn() as any,
    findAllEcosystemsByUserId: jest.fn() as any,
  };

  beforeEach(async () => {
    process.env.AUTH_INTERNAL_TOKEN = 'internal-token';

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalUsersController],
      providers: [
        {
          provide: EcosystemsService,
          useValue: ecosystemsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<InternalUsersController>(InternalUsersController);
    jest.clearAllMocks();
  });

  describe('validateApiKey', () => {
    it('forwards the api key and coordinates to the service when the internal token matches', async () => {
      (ecosystemsServiceMock.validateApiKey as any).mockResolvedValue({ valid: true, ecosystemId: 'eco-id' });

      const result = await controller.validateApiKey(
        'Bearer internal-token',
        'AUR-VALID-API-KEY-123',
        { latitude: 40.4168, longitude: -3.7038 },
      );

      expect(ecosystemsServiceMock.validateApiKey).toHaveBeenCalledWith('AUR-VALID-API-KEY-123', 40.4168, -3.7038);
      expect(result).toEqual({ valid: true, ecosystemId: 'eco-id' });
    });

    it('rejects requests with an invalid internal token', async () => {
      await expect(
        controller.validateApiKey('Bearer wrong-token', 'AUR-VALID-API-KEY-123', { latitude: 40.4168, longitude: -3.7038 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects requests without the x-api-key header', async () => {
      await expect(
        controller.validateApiKey('Bearer internal-token', undefined, { latitude: 40.4168, longitude: -3.7038 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts request when no internal token is configured', async () => {
      delete process.env.AUTH_INTERNAL_TOKEN;

      const module: TestingModule = await Test.createTestingModule({
        controllers: [InternalUsersController],
        providers: [{ provide: EcosystemsService, useValue: ecosystemsServiceMock }],
      }).compile();
      controller = module.get<InternalUsersController>(InternalUsersController);

      (ecosystemsServiceMock.validateApiKey as any).mockResolvedValue({ valid: true, ecosystemId: 'eco-id' });

      const result = await controller.validateApiKey(undefined, 'AUR-KEY', { latitude: 1, longitude: 2 });
      expect(result).toEqual({ valid: true, ecosystemId: 'eco-id' });
    });
  });

  describe('signHash', () => {
    it('forwards sign request to service when token matches', async () => {
      (ecosystemsServiceMock.signHash as any).mockResolvedValue({ signature: 'sig', publicKey: 'key' });

      const result = await controller.signHash('Bearer internal-token', { ecosystemId: 'eco-1', hash: 'hash-data' });

      expect(ecosystemsServiceMock.signHash).toHaveBeenCalledWith('eco-1', 'hash-data');
      expect(result).toEqual({ signature: 'sig', publicKey: 'key' });
    });

    it('rejects with invalid token', async () => {
      await expect(
        controller.signHash('Bearer wrong-token', { ecosystemId: 'eco-1', hash: 'hash' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getUserEcosystems', () => {
    it('returns ecosystems for user when token matches', async () => {
      (ecosystemsServiceMock.findAllEcosystemsByUserId as any).mockResolvedValue([{ id: 'eco-1' }, { id: 'eco-2' }]);

      const result = await controller.getUserEcosystems('Bearer internal-token', 'user-1');

      expect(ecosystemsServiceMock.findAllEcosystemsByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ ecosystemIds: ['eco-1', 'eco-2'] });
    });

    it('rejects with invalid token', async () => {
      await expect(
        controller.getUserEcosystems('Bearer wrong-token', 'user-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws BadRequestException when userId is empty', async () => {
      await expect(
        controller.getUserEcosystems('Bearer internal-token', ''),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
