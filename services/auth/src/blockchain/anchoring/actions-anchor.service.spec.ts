import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { ActionsAnchorService } from './actions-anchor.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../crypto/crypto.service';
import { ActionType } from './action-types.enum';

describe('ActionsAnchorService', () => {
  let service: ActionsAnchorService;

  const httpServiceMock = { post: jest.fn() };
  const prismaMock = { user: { findUnique: jest.fn() as any } };
  const cryptoMock = {
    decryptPrivateKey: jest.fn() as any,
    hashSha256: jest.fn() as any,
    sign: jest.fn() as any,
  };

  const defaultActorKeys = {
    identity: {
      publicKey: 'pub-key-pem',
      privateKeyCiphertext: 'cipher',
      privateKeyIv: 'iv',
      privateKeyAuthTag: 'tag',
    },
  };

  beforeEach(async () => {
    process.env.FIREFLY_API_URL = 'http://firefly.local';
    delete process.env.BLOCKCHAIN_ANCHOR_BLOCKING;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionsAnchorService,
        { provide: HttpService, useValue: httpServiceMock },
        { provide: PrismaService, useValue: prismaMock },
        { provide: CryptoService, useValue: cryptoMock },
      ],
    }).compile();

    service = module.get<ActionsAnchorService>(ActionsAnchorService);
    jest.clearAllMocks();

    prismaMock.user.findUnique.mockResolvedValue(defaultActorKeys);
    cryptoMock.decryptPrivateKey.mockReturnValue('decrypted-private-key');
    cryptoMock.hashSha256.mockReturnValue('sha256-hash');
    cryptoMock.sign.mockReturnValue('base64-signature');
  });

  const anchorParams = {
    actionType: ActionType.ACCOUNT_APPROVE,
    actorId: 'actor-1',
    targetId: 'target-1',
    readableDescription: 'Anchor test',
  };

  describe('anchorAction', () => {
    it('should anchor action successfully in non-blocking mode', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: { id: 'tx-1', hash: '0xabc' } }));

      const result = await service.anchorAction(anchorParams);

      expect(result).toEqual({ id: expect.any(String) });
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'actor-1' },
        select: expect.objectContaining({ identity: expect.anything() }),
      });
      expect(httpServiceMock.post).toHaveBeenCalledTimes(1);
    });

    it('should anchor action successfully in blocking mode', async () => {
      process.env.BLOCKCHAIN_ANCHOR_BLOCKING = 'true';
      httpServiceMock.post.mockReturnValue(of({ data: { id: 'tx-2', hash: '0xdef' } }));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ActionsAnchorService,
          { provide: HttpService, useValue: httpServiceMock },
          { provide: PrismaService, useValue: prismaMock },
          { provide: CryptoService, useValue: cryptoMock },
        ],
      }).compile();
      service = module.get<ActionsAnchorService>(ActionsAnchorService);

      const result = await service.anchorAction(anchorParams);

      expect(result).toEqual({ id: expect.any(String) });
    });

    it('should use custom actionId when provided', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: { id: 'tx-3' } }));

      const result = await service.anchorAction({
        ...anchorParams,
        actionId: 'custom-action-id',
      });

      expect(result).toEqual({ id: 'custom-action-id' });
    });

    it('should include parentActionId when provided', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: {} }));

      await service.anchorAction({
        ...anchorParams,
        parentActionId: 'parent-1',
      });

      const callArgs = (httpServiceMock.post as jest.Mock).mock.calls[0] as any;
      expect(callArgs[1].input.parentActionID).toBe('parent-1');
    });

    it('should include metadata when provided', async () => {
      httpServiceMock.post.mockReturnValue(of({ data: {} }));

      await service.anchorAction({
        ...anchorParams,
        metadata: { grantedUserId: 'user-1', ecosystemId: 'eco-1' },
      });

      const callArgs = (httpServiceMock.post as jest.Mock).mock.calls[0] as any;
      const metadataJSON = callArgs[1].input.metadataJSON;
      const parsed = JSON.parse(metadataJSON);
      expect(parsed.grantedUserId).toBe('user-1');
      expect(parsed.ecosystemId).toBe('eco-1');
    });

    it('should throw when FIREFLY_API_URL is missing in blocking mode', async () => {
      delete process.env.FIREFLY_API_URL;
      process.env.BLOCKCHAIN_ANCHOR_BLOCKING = 'true';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ActionsAnchorService,
          { provide: HttpService, useValue: httpServiceMock },
          { provide: PrismaService, useValue: prismaMock },
          { provide: CryptoService, useValue: cryptoMock },
        ],
      }).compile();
      service = module.get<ActionsAnchorService>(ActionsAnchorService);

      await expect(service.anchorAction(anchorParams)).rejects.toThrow(
        'FIREFLY_API_URL is not defined',
      );
    });

    it('should throw BadRequestException when actor has no identity', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.anchorAction(anchorParams);

      expect(result).toBeNull();
    });

    it('should throw BadRequestException when actor has incomplete keys', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        identity: {
          publicKey: null,
          privateKeyCiphertext: 'cipher',
          privateKeyIv: 'iv',
          privateKeyAuthTag: 'tag',
        },
      });

      const result = await service.anchorAction(anchorParams);

      expect(result).toBeNull();
    });

    it('should return null on HTTP error in non-blocking mode', async () => {
      httpServiceMock.post.mockReturnValue(throwError(() => new Error('network error')));

      const result = await service.anchorAction(anchorParams);

      expect(result).toBeNull();
    }, 30000);

    it('should throw on HTTP error in blocking mode', async () => {
      process.env.BLOCKCHAIN_ANCHOR_BLOCKING = 'true';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ActionsAnchorService,
          { provide: HttpService, useValue: httpServiceMock },
          { provide: PrismaService, useValue: prismaMock },
          { provide: CryptoService, useValue: cryptoMock },
        ],
      }).compile();
      service = module.get<ActionsAnchorService>(ActionsAnchorService);

      httpServiceMock.post.mockReturnValue(throwError(() => new Error('blocking error')));

      await expect(service.anchorAction(anchorParams)).rejects.toThrow(
        'Blockchain anchor failed',
      );
    }, 30000);

    it('should return null when resolveActorKeys fails in non-blocking mode', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('db error'));

      const result = await service.anchorAction(anchorParams);

      expect(result).toBeNull();
    });

    it('should throw when resolveActorKeys fails in blocking mode', async () => {
      process.env.BLOCKCHAIN_ANCHOR_BLOCKING = 'true';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ActionsAnchorService,
          { provide: HttpService, useValue: httpServiceMock },
          { provide: PrismaService, useValue: prismaMock },
          { provide: CryptoService, useValue: cryptoMock },
        ],
      }).compile();
      service = module.get<ActionsAnchorService>(ActionsAnchorService);

      prismaMock.user.findUnique.mockRejectedValue(new Error('db error'));

      await expect(service.anchorAction(anchorParams)).rejects.toThrow(
        'Blockchain anchor failed',
      );
    });
  });
});
