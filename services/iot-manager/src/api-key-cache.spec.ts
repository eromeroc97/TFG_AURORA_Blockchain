import Redis from 'ioredis';
import { buildApiKeyCache } from './api-key-cache';
import type { AppConfig } from './config';

const getMock = jest.fn<Promise<string | null>, [string]>();
const setMock = jest.fn<Promise<void>, [string, string, string, number]>();
const quitMock = jest.fn<Promise<void>, []>();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: getMock,
    set: setMock,
    quit: quitMock,
  }));
});

const RedisMock = Redis as unknown as jest.Mock<any, any>;

describe('ApiKeyCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses in-memory cache when redisUrl is not configured', async () => {
    const cache = buildApiKeyCache({} as AppConfig, 100);

    await cache.set('cache-key', { ecosystemId: 'eco-1' });
    expect(await cache.get('cache-key')).toEqual({ ecosystemId: 'eco-1' });
    expect(await cache.get('missing')).toBeNull();
  });

  it('uses Redis cache when redisUrl is provided', async () => {
    const config = { redisUrl: 'redis://localhost:6379' } as AppConfig;
    const cache = buildApiKeyCache(config, 3000);

    expect(RedisMock).toHaveBeenCalledWith(config.redisUrl, expect.objectContaining({
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: true,
    }));

    await cache.set('cache-key', { ecosystemId: 'eco-1' });
    expect(setMock).toHaveBeenCalledWith('iot:api-key:valid:cache-key', JSON.stringify({ ecosystemId: 'eco-1' }), 'EX', 3);

    getMock.mockResolvedValueOnce(JSON.stringify({ ecosystemId: 'eco-1' }));
    expect(await cache.get('cache-key')).toEqual({ ecosystemId: 'eco-1' });
  });

  it('returns null when Redis cache contains invalid json', async () => {
    const cache = buildApiKeyCache({ redisUrl: 'redis://localhost:6379' } as AppConfig, 1000);

    getMock.mockResolvedValueOnce('not-json');
    expect(await cache.get('cache-key')).toBeNull();
  });

  it('returns null when Redis cache has missing ecosystemId', async () => {
    const cache = buildApiKeyCache({ redisUrl: 'redis://localhost:6379' } as AppConfig, 1000);

    getMock.mockResolvedValueOnce(JSON.stringify({}));
    expect(await cache.get('cache-key')).toBeNull();
  });

  it('close() quits the Redis client', async () => {
    const cache = buildApiKeyCache({ redisUrl: 'redis://localhost:6379' } as AppConfig, 1000);
    await cache.close();

    expect(quitMock).toHaveBeenCalled();
  });
});
