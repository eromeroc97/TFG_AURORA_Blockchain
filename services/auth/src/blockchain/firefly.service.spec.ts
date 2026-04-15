import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpService } from '@nestjs/axios';
import { FireflyService } from './firefly.service';

describe('FireflyService', () => {
  let service: FireflyService;

  const httpServiceMock = {
    axiosRef: {
      get: jest.fn(),
      post: jest.fn(),
    },
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
    delete process.env.FIREFLY_API_URL;
  });

  it('returns fallback when FIREFLY_API_URL is missing', async () => {
    const did = await service.getOrganizationDid();

    expect(did).toBe('did:firefly:offline-generated-org');
    expect(httpServiceMock.axiosRef.get).not.toHaveBeenCalled();
  });

  it('returns org did when FireFly responds with an identity list', async () => {
    process.env.FIREFLY_API_URL = 'http://firefly.local/api/v1/namespaces/default';
    (httpServiceMock.axiosRef.get as any).mockResolvedValue({
      data: [{ did: 'did:firefly:org/demo' }],
    });

    const did = await service.getOrganizationDid();

    expect(httpServiceMock.axiosRef.get).toHaveBeenCalledWith(
      'http://firefly.local/api/v1/namespaces/default/identities?type=org',
    );
    expect(did).toBe('did:firefly:org/demo');
  });

  it('returns fallback when FireFly response has no did', async () => {
    process.env.FIREFLY_API_URL = 'http://firefly.local/api/v1/namespaces/default';
    (httpServiceMock.axiosRef.get as any).mockResolvedValue({ data: [] });

    const did = await service.getOrganizationDid();

    expect(did).toBe('did:firefly:offline-generated-org');
  });

  it('returns fallback when FireFly throws', async () => {
    process.env.FIREFLY_API_URL = 'http://firefly.local/api/v1/namespaces/default';
    (httpServiceMock.axiosRef.get as any).mockRejectedValue(new Error('firefly down'));

    const did = await service.getOrganizationDid();

    expect(did).toBe('did:firefly:offline-generated-org');
  });

  describe('createIdentity', () => {
    const payload = {
      name: 'user@aurora.local',
      parent: 'did:firefly:custom/admin@aurora.local',
    };

    it('should return did from FireFly when available', async () => {
      (httpServiceMock.axiosRef.post as jest.Mock).mockResolvedValue({
        data: {
          id: 'identity-001',
          did: 'did:firefly:custom/user@aurora.local',
          parent: payload.parent,
        },
      } as never);

      const did = await service.createIdentity(payload);

      expect(httpServiceMock.axiosRef.post).toHaveBeenCalledWith(
        '/identities',
        payload,
      );
      expect(did).toBe('did:firefly:custom/user@aurora.local');
    });

    it('should fallback to deterministic did when FireFly fails', async () => {
      (httpServiceMock.axiosRef.post as jest.Mock).mockRejectedValue(
        new Error('network failure') as never,
      );

      const did = await service.createIdentity(payload);

      expect(did).toBe('did:firefly:custom/user@aurora.local');
    });
  });
});
