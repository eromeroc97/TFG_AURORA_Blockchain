import Redis from 'ioredis';
import type { AppConfig } from './config';

export type CachedValidApiKey = {
  ecosystemId: string;
  did: string;
};

export interface ApiKeyCache {
  get(cacheKey: string): Promise<CachedValidApiKey | null>;
  set(cacheKey: string, value: CachedValidApiKey): Promise<void>;
  close(): Promise<void>;
}

const CACHE_KEY_PREFIX = 'iot:api-key:valid:';

class InMemoryApiKeyCache implements ApiKeyCache {
  private readonly values = new Map<string, { value: CachedValidApiKey; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  async get(cacheKey: string): Promise<CachedValidApiKey | null> {
    const cached = this.values.get(cacheKey);

    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.values.delete(cacheKey);
      return null;
    }

    return cached.value;
  }

  async set(cacheKey: string, value: CachedValidApiKey): Promise<void> {
    this.values.set(cacheKey, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  async close(): Promise<void> {
    this.values.clear();
  }
}

class RedisApiKeyCache implements ApiKeyCache {
  private readonly redis: Redis;
  private readonly ttlSeconds: number;

  constructor(redisUrl: string, ttlMs: number) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: true,
    });
    this.ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));
  }

  private buildKey(cacheKey: string): string {
    return `${CACHE_KEY_PREFIX}${cacheKey}`;
  }

  async get(cacheKey: string): Promise<CachedValidApiKey | null> {
    const raw = await this.redis.get(this.buildKey(cacheKey));

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CachedValidApiKey;
      if (!parsed?.ecosystemId || !parsed?.did) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  async set(cacheKey: string, value: CachedValidApiKey): Promise<void> {
    await this.redis.set(this.buildKey(cacheKey), JSON.stringify(value), 'EX', this.ttlSeconds);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export const buildApiKeyCache = (config: AppConfig, ttlMs: number): ApiKeyCache => {
  if (config.redisUrl) {
    return new RedisApiKeyCache(config.redisUrl, ttlMs);
  }

  return new InMemoryApiKeyCache(ttlMs);
};
