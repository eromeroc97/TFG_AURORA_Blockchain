import 'dotenv/config';
import { createHash } from 'crypto';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { loadConfig, type AppConfig } from './config';
import { MongoTelemetryStore, type TelemetryStore } from './telemetry-store';

type ApiKeyValidationResult = {
  valid: boolean;
  ecosystemId?: string;
  did?: string;
  status?: string;
};

type ApiKeyValidationInput = {
  apiKey: string;
  latitude: number;
  longitude: number;
};

type AppOptions = {
  config?: AppConfig;
  telemetryStore?: TelemetryStore;
  apiKeyValidator?: (input: ApiKeyValidationInput) => Promise<ApiKeyValidationResult>;
  positiveTtlMs?: number;
  negativeTtlMs?: number;
  now?: () => number;
};

type CachedApiKeyValidation =
  | {
      kind: 'valid';
      ecosystemId: string;
      did: string;
      expiresAt: number;
    }
  | {
      kind: 'invalid';
      expiresAt: number;
    };

type AuthContext = {
  ecosystemId: string;
  did: string;
};

type IngestRequestBody = {
  latitude: number;
  longitude: number;
  devices: Array<{
    mac_addr: string;
    [key: string]: unknown;
  }>;
  timestamp?: string;
};

type AuthenticatedFastifyRequest = FastifyRequest & {
  authContext?: AuthContext;
};

const DEFAULT_POSITIVE_TTL_MS = 60_000;
const DEFAULT_NEGATIVE_TTL_MS = 15_000;

const getApiKeyFromHeader = (request: FastifyRequest): string | null => {
  const headerValue = request.headers['x-api-key'];

  if (typeof headerValue === 'string') {
    return headerValue.trim() || null;
  }

  if (Array.isArray(headerValue)) {
    const first = headerValue[0]?.trim();
    return first || null;
  }

  return null;
};

const hashApiKey = (apiKey: string): string => createHash('sha256').update(apiKey).digest('hex');

const stableSortObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableSortObject);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
        acc[key] = stableSortObject(nestedValue);
        return acc;
      }, {});
  }

  return value;
};

const buildPayloadHash = (payload: Record<string, unknown>): string => {
  const normalizedPayload = stableSortObject(payload);
  return createHash('sha256').update(JSON.stringify(normalizedPayload)).digest('hex');
};

const parseStaticMap = (
  raw: string | undefined,
): Record<string, { ecosystemId: string; did: string }> => {

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, { ecosystemId: string; did: string }>>(
      (acc, [key, value]) => {
        if (typeof key !== 'string' || !key.trim()) {
          return acc;
        }

        if (typeof value === 'string' && value.trim()) {
          acc[key] = {
            ecosystemId: value.trim(),
            did: `did:firefly:custom/${value.trim()}`,
          };
          return acc;
        }

        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          typeof (value as Record<string, unknown>).ecosystemId === 'string' &&
          typeof (value as Record<string, unknown>).did === 'string'
        ) {
          acc[key] = {
            ecosystemId: (value as Record<string, string>).ecosystemId.trim(),
            did: (value as Record<string, string>).did.trim(),
          };
        }

        return acc;
      }
    , {});
  } catch {
    return {};
  }
};

const buildDefaultApiKeyValidator = (config: AppConfig) => {
  const validationUrl = config.authValidateApiKeyUrl;
  const internalToken = config.authInternalToken;
  const staticMap = parseStaticMap(config.iotApiKeyStaticMap);

  return async (input: ApiKeyValidationInput): Promise<ApiKeyValidationResult> => {
    if (validationUrl) {
      const response = await fetch(validationUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': input.apiKey,
          ...(internalToken ? { authorization: `Bearer ${internalToken}` } : {}),
        },
        body: JSON.stringify({
          latitude: input.latitude,
          longitude: input.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error(`Auth API key validation failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ApiKeyValidationResult;
      return payload;
    }

    const mappedEntry = staticMap[input.apiKey];
    if (mappedEntry) {
      return {
        valid: true,
        ecosystemId: mappedEntry.ecosystemId,
        did: mappedEntry.did,
        status: 'ACTIVE',
      };
    }

    return { valid: false };
  };
};

export const buildApp = (options: AppOptions = {}) => {
  const config = options.config ?? loadConfig();
  const app = Fastify({ logger: true });
  const telemetryStore = options.telemetryStore ?? new MongoTelemetryStore(config.mongoUri);
  const shouldCloseStore = !options.telemetryStore;

  const apiKeyValidator = options.apiKeyValidator ?? buildDefaultApiKeyValidator(config);
  const positiveTtlMs = options.positiveTtlMs ?? config.iotApiKeyPositiveTtlMs ?? DEFAULT_POSITIVE_TTL_MS;
  const negativeTtlMs = options.negativeTtlMs ?? config.iotApiKeyNegativeTtlMs ?? DEFAULT_NEGATIVE_TTL_MS;
  const now = options.now ?? (() => Date.now());
  const apiKeyValidationCache = new Map<string, CachedApiKeyValidation>();

  app.addHook('onClose', async () => {
    if (shouldCloseStore) {
      await telemetryStore.close();
    }
  });

  app.get('/health', async () => {
    return {
      status: 'UP',
      service: 'iot-manager',
    };
  });

  const authenticateApiKey = async (request: FastifyRequest<{ Body: IngestRequestBody }>, reply: FastifyReply) => {
    const apiKey = getApiKeyFromHeader(request);

    if (!apiKey) {
      reply.code(401).send({
        error: 'API_KEY_REQUIRED',
        message: 'x-api-key header is required',
      });
      return;
    }

    const cacheKey = hashApiKey(apiKey);
    const currentTs = now();
    const cached = apiKeyValidationCache.get(cacheKey);

    if (cached && cached.expiresAt > currentTs) {
      if (cached.kind === 'valid') {
        (request as AuthenticatedFastifyRequest).authContext = {
          ecosystemId: cached.ecosystemId,
          did: cached.did,
        };
        return;
      }

      reply.code(401).send({
        error: 'API_KEY_INVALID',
        message: 'API key is invalid',
      });
      return;
    }

    if (cached && cached.expiresAt <= currentTs) {
      apiKeyValidationCache.delete(cacheKey);
    }

    let validationResult: ApiKeyValidationResult;

    try {
      validationResult = await apiKeyValidator({
        apiKey,
        latitude: request.body.latitude,
        longitude: request.body.longitude,
      });
    } catch (error) {
      request.log.error({ error }, 'API key validation provider is unavailable');
      reply.code(503).send({
        error: 'AUTH_PROVIDER_UNAVAILABLE',
        message: 'API key validation provider is unavailable',
      });
      return;
    }

    if (!validationResult.valid || !validationResult.ecosystemId || !validationResult.did) {
      apiKeyValidationCache.set(cacheKey, {
        kind: 'invalid',
        expiresAt: currentTs + negativeTtlMs,
      });
      reply.code(401).send({
        error: 'API_KEY_INVALID',
        message: 'API key is invalid',
      });
      return;
    }

    if (validationResult.status && validationResult.status.toUpperCase() !== 'ACTIVE') {
      apiKeyValidationCache.set(cacheKey, {
        kind: 'invalid',
        expiresAt: currentTs + negativeTtlMs,
      });
      reply.code(403).send({
        error: 'ECOSYSTEM_NOT_ACTIVE',
        message: 'Ecosystem is not active',
      });
      return;
    }

    apiKeyValidationCache.set(cacheKey, {
      kind: 'valid',
      ecosystemId: validationResult.ecosystemId,
      did: validationResult.did,
      expiresAt: currentTs + positiveTtlMs,
    });
    (request as AuthenticatedFastifyRequest).authContext = {
      ecosystemId: validationResult.ecosystemId,
      did: validationResult.did,
    };
  };

  const broadcastToFirefly = (hash: string, mongoId: string, ecosystemDid: string) => {
    console.log(
      '[STUB] Simulando envio a FireFly del hash:',
      hash,
      'mongoId:',
      mongoId,
      'did:',
      ecosystemDid,
      'url:',
      config.fireflyApiUrl,
    );
  };

  app.post(
    '/v1/ingest',
    {
      preHandler: authenticateApiKey,
      schema: {
        body: {
          type: 'object',
          required: ['latitude', 'longitude', 'devices'],
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            devices: {
              type: 'array',
              items: {
                type: 'object',
                required: ['mac_addr'],
                properties: {
                  mac_addr: { type: 'string', minLength: 1 },
                },
                additionalProperties: true,
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
          additionalProperties: true,
        },
      },
    },
    async (request: FastifyRequest<{ Body: IngestRequestBody }>, reply) => {
      const authContext = (request as AuthenticatedFastifyRequest).authContext;
      const ecosystemId = authContext?.ecosystemId;

      if (!ecosystemId) {
        return reply.code(401).send({
          error: 'UNAUTHENTICATED_REQUEST',
          message: 'Authentication context is missing',
        });
      }

      const eventTimestamp = request.body.timestamp ? new Date(request.body.timestamp) : new Date(now());

      if (Number.isNaN(eventTimestamp.getTime())) {
        return reply.code(400).send({
          error: 'INVALID_TIMESTAMP',
          message: 'timestamp must be a valid ISO-8601 date-time string',
        });
      }

      const payload = {
        devices: request.body.devices,
      };

      const hash = buildPayloadHash(payload);
      const savedTelemetry = await telemetryStore.save({
        ecosystemId,
        latitude: request.body.latitude,
        longitude: request.body.longitude,
        payload,
        hash,
        timestamp: eventTimestamp,
      });

      void Promise.resolve().then(() => {
        broadcastToFirefly(hash, savedTelemetry.id, authContext.did);
      });

      return reply.code(202).send({
        ingestId: savedTelemetry.id,
        status: 'ACCEPTED',
        ecosystemId,
        hash,
        receivedAt: new Date(now()).toISOString(),
      });
    },
  );

  return app;
};

const start = async () => {
  const config = loadConfig();
  const app = buildApp({ config });

  try {
    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) {
  void start();
}
