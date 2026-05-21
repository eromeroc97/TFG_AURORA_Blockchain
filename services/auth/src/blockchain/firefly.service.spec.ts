import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { FireflyService } from './firefly.service';

describe('FireflyService', () => {
  let service: FireflyService;

  const defaultOrgData = { data: { org: { id: 'org-1', verifiers: [{ type: 'key', value: 'verifier-1' }] } } };
  const httpServiceMock = {
    get: jest.fn(() => of(defaultOrgData)),
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
    process.env.FIREFLY_API_URL = 'http://firefly.local';
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
        'http://firefly.local/namespaces/default/messages/broadcast',
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

    it('should throw when broadcast returns no message ID', async () => {
      (httpServiceMock.post as jest.Mock).mockReturnValue(
        of({ data: { hash: '0xabc123' } }),
      );

      await expect(service.broadcastAnchor(anchorPayload)).rejects.toThrow(
        'FireFly broadcast did not return message ID',
      );
    });
  });

  describe('createIdentity', () => {
    it('should delegate to createChildIdentity and return DID', async () => {
      (httpServiceMock.post as jest.Mock).mockReturnValue(
        of({ data: { id: 'identity-1', did: 'did:firefly:identity-1' } }),
      );

      const result = await service.createIdentity({ name: 'test-identity', parentDid: 'did:parent' });

      expect(result).toBe('did:firefly:identity-1');
    });
  });

  describe('createChildIdentity', () => {
    it('should create identity successfully', async () => {
      (httpServiceMock.post as jest.Mock).mockReturnValue(
        of({ data: { id: 'identity-1', did: 'did:firefly:identity-1' } }),
      );

      const result = await service.createChildIdentity({ name: 'test-device' });

      expect(httpServiceMock.post).toHaveBeenCalledWith(
        'http://firefly.local/namespaces/default/identities?confirm=true',
        {
          name: 'test-device',
          type: 'custom',
          parent: 'org-1',
          key: 'verifier-1',
        },
      );
      expect(result).toBe('did:firefly:identity-1');
    });

    it('should retry on failure and succeed', async () => {
      (httpServiceMock.post as jest.Mock)
        .mockReturnValueOnce(throwError(() => new Error('timeout')))
        .mockReturnValueOnce(of({ data: { id: 'identity-2', did: 'did:firefly:identity-2' } }));

      const result = await service.createChildIdentity({ name: 'retry-device' });

      expect(httpServiceMock.post).toHaveBeenCalledTimes(2);
      expect(result).toBe('did:firefly:identity-2');
    });

    it('should throw after max retries', async () => {
      (httpServiceMock.post as jest.Mock).mockReturnValue(
        throwError(() => new Error('firefly unreachable')),
      );

      await expect(service.createChildIdentity({ name: 'fail-device' })).rejects.toThrow(
        'Identity creation failed after 3 attempts',
      );
    });

    it('should throw when POST returns no identity ID', async () => {
      (httpServiceMock.post as jest.Mock).mockReturnValue(
        of({ data: { did: 'did:firefly:no-id' } }),
      );

      await expect(service.createChildIdentity({ name: 'no-id' })).rejects.toThrow(
        'FireFly POST did not return identity ID',
      );
    });

    it('should throw when POST returns no DID', async () => {
      (httpServiceMock.post as jest.Mock).mockReturnValue(
        of({ data: { id: 'identity-no-did' } }),
      );

      await expect(service.createChildIdentity({ name: 'no-did' })).rejects.toThrow(
        'FireFly POST with confirm=true did not return confirmed DID',
      );
    });
  });

  describe('ensureInitialized (organization keys)', () => {
    function makeVerifierResponse(verifiers: Array<{ type: string; value: string }> | undefined) {
      return of({ data: { org: { id: 'org-1', verifiers } } });
    }

    it('should use verifier from /status when available', async () => {
      (httpServiceMock.get as jest.Mock).mockReturnValue(
        of({ data: { org: { id: 'org-1', verifiers: [{ type: 'key', value: 'direct-verifier' }] } } }),
      );
      (httpServiceMock.post as jest.Mock).mockReturnValue(
        of({ data: { id: 'id-1', did: 'did:test' } }),
      );

      const result = await service.createChildIdentity({ name: 'test' });

      expect(httpServiceMock.get).toHaveBeenCalledWith(
        'http://firefly.local/namespaces/default/status',
      );
      expect(httpServiceMock.get).toHaveBeenCalledTimes(1);
      expect(result).toBe('did:test');
    });

    it('should fallback to /verifiers endpoint when verifier is missing from /status', async () => {
      (httpServiceMock.get as jest.Mock)
        .mockReturnValueOnce(makeVerifierResponse(undefined))
        .mockReturnValueOnce(of({ data: [{ value: 'fallback-verifier' }] }));
      (httpServiceMock.post as jest.Mock).mockReturnValue(
        of({ data: { id: 'id-2', did: 'did:fallback' } }),
      );

      const result = await service.createChildIdentity({ name: 'fallback' });

      expect(httpServiceMock.get).toHaveBeenCalledWith(
        'http://firefly.local/namespaces/default/status',
      );
      expect(httpServiceMock.get).toHaveBeenCalledWith(
        'http://firefly.local/namespaces/default/verifiers',
      );
      expect(result).toBe('did:fallback');
    });

    it('should throw when no verifier key is available from either source', async () => {
      (httpServiceMock.get as jest.Mock)
        .mockReturnValueOnce(makeVerifierResponse(undefined))
        .mockReturnValueOnce(of({ data: [] }));

      await expect(service.createChildIdentity({ name: 'no-key' })).rejects.toThrow(
        'No blockchain key available from FireFly',
      );
    });
  });
});
