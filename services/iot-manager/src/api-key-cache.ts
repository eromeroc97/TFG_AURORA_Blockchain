import Redis from 'ioredis';
import type { AppConfig } from './config';

/**
 * Datos de una API key validada en caché.
 */
export type CachedValidApiKey = {
	/** ID del ecosistema asociado */
	ecosystemId: string;
};

/**
 * Interfaz para caché de API keys.
 * Abstrae el backend (Redis o memoria).
 */
export interface ApiKeyCache {
	/**
	 * Obtiene una API key desde el caché.
	 *
	 * @param cacheKey - Clave de caché
	 * @returns Promise con los datos o null
	 */
	get(cacheKey: string): Promise<CachedValidApiKey | null>;

	/**
	 * Almacena una API key validada.
	 *
	 * @param cacheKey - Clave de caché
	 * @param value - Datos a almacenar
	 */
	set(cacheKey: string, value: CachedValidApiKey): Promise<void>;

	/**
	 * Cierra la conexión al caché.
	 */
	close(): Promise<void>;
}

const CACHE_KEY_PREFIX = 'iot:api-key:valid:';

/**
 * Implementación en memoria de ApiKeyCache.
 * Útil para desarrollo o cuando Redis no está disponible.
 */
class InMemoryApiKeyCache implements ApiKeyCache {
	private readonly values = new Map<string, { value: CachedValidApiKey; expiresAt: number }>();

	/**
	 * @param ttlMs - Tiempo de vida en milisegundos
	 */
	constructor(private readonly ttlMs: number) {}

  /**
   * Obtiene los datos de una clave desde memoria.
   *
   * @param cacheKey - Clave de búsqueda
   * @returns Promise con los datos o null si no existe/expiró
   */
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

  /**
   * Almacena los datos con TTL.
   *
   * @param cacheKey - Clave
   * @param value - Datos a almacenar
   */
  async set(cacheKey: string, value: CachedValidApiKey): Promise<void> {
    this.values.set(cacheKey, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Limpia el mapa de memoria.
   */
  async close(): Promise<void> {
    this.values.clear();
  }
}

/**
 * Implementación de ApiKeyCache usando Redis.
 * Almacena claves en Redis con TTL automático.
 */
class RedisApiKeyCache implements ApiKeyCache {
  private readonly redis: Redis;
  private readonly ttlSeconds: number;

  /**
   * @param redisUrl - URL de conexión a Redis
   * @param ttlMs - Tiempo de vida en milisegundos
   */
  constructor(redisUrl: string, ttlMs: number) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: true,
    });
    this.ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));
  }

  /**
   * Construye la key de Redis con prefijo.
   *
   * @param cacheKey - Clave base
   * @returns Key formateada
   */
  private buildKey(cacheKey: string): string {
    return `${CACHE_KEY_PREFIX}${cacheKey}`;
  }

  /**
   * Obtiene los datos desde Redis.
   *
   * @param cacheKey - Clave de búsqueda
   * @returns Promise con los datos o null
   */
  async get(cacheKey: string): Promise<CachedValidApiKey | null> {
    const raw = await this.redis.get(this.buildKey(cacheKey));

    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as CachedValidApiKey;
      if (!parsed?.ecosystemId) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Almacena los datos en Redis con TTL.
   *
   * @param cacheKey - Clave
   * @param value - Datos a almacenar
   */
  async set(cacheKey: string, value: CachedValidApiKey): Promise<void> {
    await this.redis.set(this.buildKey(cacheKey), JSON.stringify(value), 'EX', this.ttlSeconds);
  }

  /**
   * Cierra la conexión a Redis.
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * Fábrica para crear ApiKeyCache.
 * Elige implementación según la configuración.
 *
 * @param config - Configuración de la aplicación
 * @param ttlMs - Tiempo de vida para el caché
 * @returns Instancia de ApiKeyCache
 */
export const buildApiKeyCache = (config: AppConfig, ttlMs: number): ApiKeyCache => {
  if (config.redisUrl) {
    return new RedisApiKeyCache(config.redisUrl, ttlMs);
  }

  return new InMemoryApiKeyCache(ttlMs);
};
