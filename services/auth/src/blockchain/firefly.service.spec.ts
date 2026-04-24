import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { FireflyService } from './firefly.service';

describe('FireflyService', () => {
  let service: FireflyService;

  const httpServiceMock = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FireflyService,
        {
          provide: HttpService,
          useValue: httpServiceMock,
        },
      ],
    }).compile();

    service = module.get<FireflyService>(FireflyService);
    jest.clearAllMocks();
    process.env.FIREFLY_API_URL = 'http://firefly.local/api/v1/namespaces/default';
  });

  it('should throw when FIREFLY_API_URL is missing', async () => {
    delete process.env.FIREFLY_API_URL;

    await expect(
      service.broadcastAnchor({
        actionId: 'USER_APPROVE',
        originalHash: 'abc123',
        signature: 'sigxyz',
        signerPublicKey: 'pubkey',
        timestamp: new Date().toISOString(),
      }),
    ).rejects.toThrow('FIREFLY_API_URL is not defined');
  });

  describe('broadcastAnchor', () => {
    const anchorPayload = {
      actionId: 'USER_APPROVE',
      originalHash: 'abc123def456',
      signature: 'MEUCIQDTestSignature',
      signerPublicKey: '-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----',
      timestamp: '2026-04-24T10:00:00.000Z',
    };

    it('should broadcast anchor payload successfully', async () => {
      (httpServiceMock.post as jest.Mock).mockReturnValue(
        of({ data: { id: 'msg-001', hash: '0xabc123' } }),
      );

      const result = await service.broadcastAnchor(anchorPayload);

      expect(httpServiceMock.post).toHaveBeenCalledWith(
        'http://firefly.local/api/v1/namespaces/default/messages/broadcast',
        { data: anchorPayload },
      );
      expect(result.id).toBe('msg-001');
      expect(result.hash).toBe('0xabc123');
    });

    it('should retry on failure and succeed', async () => {
      (httpServiceMock.post as jest.Mock)
        .mockReturnValueOnce(throwError(() => new Error('network error')))
        .mockReturnValueOnce(of({ data: { id: 'msg-002', hash: '0xdef456' } }));

      const result = await service.broadcastAnchor(anchorPayload);

      expect(httpServiceMock.post).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('msg-002');
    });

    it('should throw after max retries', async () => {
      (httpServiceMock.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('firefly down')),
      );

      await expect(service.broadcastAnchor(anchorPayload)).rejects.toThrow(
        'Anchor broadcast failed after 3 attempts',
      );
    });
  });
});