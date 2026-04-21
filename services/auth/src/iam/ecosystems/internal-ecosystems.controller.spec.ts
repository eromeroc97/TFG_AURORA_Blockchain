import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InternalAuthController } from './internal-ecosystems.controller';
import { EcosystemsService } from './ecosystems.service';

describe('InternalAuthController', () => {
  let controller: InternalAuthController;

  const ecosystemsServiceMock = {
    validateApiKey: jest.fn(),
  };

  beforeEach(async () => {
    process.env.AUTH_INTERNAL_TOKEN = 'internal-token';

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalAuthController],
      providers: [
        {
          provide: EcosystemsService,
          useValue: ecosystemsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<InternalAuthController>(InternalAuthController);
    jest.clearAllMocks();
  });

  it('forwards the api key and coordinates to the service when the internal token matches', async () => {
    (ecosystemsServiceMock.validateApiKey as any).mockResolvedValue({
      valid: true,
      ecosystemId: 'eco-id',
      did: 'did:firefly:custom/eco-id',
      status: 'ACTIVE',
    });

    const result = await controller.validateApiKey(
      'Bearer internal-token',
      'AUR-VALID-API-KEY-123',
      {
        latitude: 40.4168,
        longitude: -3.7038,
      },
    );

    expect(ecosystemsServiceMock.validateApiKey).toHaveBeenCalledWith(
      'AUR-VALID-API-KEY-123',
      40.4168,
      -3.7038,
    );
    expect(result).toEqual({
      valid: true,
      ecosystemId: 'eco-id',
      did: 'did:firefly:custom/eco-id',
      status: 'ACTIVE',
    });
  });

  it('rejects requests with an invalid internal token', async () => {
    await expect(
      controller.validateApiKey('Bearer wrong-token', 'AUR-VALID-API-KEY-123', {
        latitude: 40.4168,
        longitude: -3.7038,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects requests without the x-api-key header', async () => {
    await expect(
      controller.validateApiKey('Bearer internal-token', undefined, {
        latitude: 40.4168,
        longitude: -3.7038,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});