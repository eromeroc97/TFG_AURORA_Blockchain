import 'dotenv/config';
import { createHash } from 'crypto';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { buildApiKeyCache, type ApiKeyCache } from './api-key-cache';
import { loadConfig, type AppConfig } from './config';
import { DeviceDiscoveryService } from './device-discovery';
import { MongoTelemetryStore, type TelemetryStore } from './telemetry-store';

type ApiKeyValidationResult = {
  valid: boolean;
  ecosystemId?: string;
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
  apiKeyCache?: ApiKeyCache;
  positiveTtlMs?: number;
  negativeTtlMs?: number;
  now?: () => number;
};

type AuthContext = {
  ecosystemId: string;
  publicKey: string;
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

const DEFAULT_POSITIVE_TTL_MS = 600_000;
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

const buildPayloadHash = (
  payload: Record<string, unknown>,
  latitude: number,
  longitude: number,
): string => {
  const normalizedPayload = stableSortObject(payload);
  const dataToHash = JSON.stringify({
    payload: normalizedPayload,
    gps: { latitude, longitude },
  });
  return createHash('sha256').update(dataToHash).digest('hex');
};

const parseStaticMap = (
  raw: string | undefined,
): Record<string, { ecosystemId: string }> => {

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, { ecosystemId: string }>>(
      (acc, [key, value]) => {
        if (typeof key !== 'string' || !key.trim()) {
          return acc;
        }

        if (typeof value === 'string' && value.trim()) {
          acc[key] = {
            ecosystemId: value.trim(),
          };
          return acc;
        }

        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          typeof (value as Record<string, unknown>).ecosystemId === 'string'
        ) {
          acc[key] = {
            ecosystemId: (value as Record<string, string>).ecosystemId.trim(),
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
  const deviceDiscovery = new DeviceDiscoveryService(config);

  const apiKeyValidator = options.apiKeyValidator ?? buildDefaultApiKeyValidator(config);
  const positiveTtlMs = options.positiveTtlMs ?? config.iotApiKeyPositiveTtlMs ?? DEFAULT_POSITIVE_TTL_MS;
  const negativeTtlMs = options.negativeTtlMs ?? config.iotApiKeyNegativeTtlMs ?? DEFAULT_NEGATIVE_TTL_MS;
  const now = options.now ?? (() => Date.now());
  const apiKeyCache = options.apiKeyCache ?? buildApiKeyCache(config, positiveTtlMs);
  const shouldCloseApiKeyCache = !options.apiKeyCache;
  const invalidApiKeyCache = new Map<string, { expiresAt: number }>();

  app.addHook('onClose', async () => {
    if (shouldCloseStore) {
      await telemetryStore.close();
    }

    if (shouldCloseApiKeyCache) {
      await apiKeyCache.close();
    }
  });

  app.get('/health', async () => {
    return {
      status: 'UP',
      service: 'iot-manager',
    };
  });

  const sendLastInteractionResponse = async (
    reply: FastifyReply,
    lastInteractionAt: Date | null,
  ) => {
    return reply.code(200).send({
      lastInteractionAt: lastInteractionAt ? lastInteractionAt.toISOString() : null,
    });
  };

  const readQueryLastInteraction = async (
    request: FastifyRequest<{ Querystring: { macAddress?: string; ecosystemId?: string } }>,
    reply: FastifyReply,
  ) => {
    const macAddress = request.query.macAddress?.trim();
    const ecosystemId = request.query.ecosystemId?.trim();

    if (!macAddress || !ecosystemId) {
      return reply.code(400).send({
        error: 'INVALID_REQUEST',
        message: 'macAddress and ecosystemId query parameters are required',
      });
    }

    const lastInteractionAt = await telemetryStore.findLastInteraction(macAddress, ecosystemId);
    return sendLastInteractionResponse(reply, lastInteractionAt);
  };

  app.get('/iot/devices/last-interaction', readQueryLastInteraction);
  app.get('/devices/last-interaction', readQueryLastInteraction);

  const readParamLastInteraction = async (
    request: FastifyRequest<{ Params: { deviceId: string } }>,
    reply: FastifyReply,
  ) => {
    const deviceId = request.params.deviceId?.trim();

    if (!deviceId) {
      return reply.code(400).send({
        error: 'INVALID_DEVICE_ID',
        message: 'deviceId param is required',
      });
    }

    const lastInteractionAt = await telemetryStore.findLastInteraction(deviceId);
    return sendLastInteractionResponse(reply, lastInteractionAt);
  };

  app.get('/iot/devices/:deviceId/last-interaction', readParamLastInteraction);
  app.get('/devices/:deviceId/last-interaction', readParamLastInteraction);

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

    try {
      const cachedValidApiKey = await apiKeyCache.get(cacheKey);
      if (cachedValidApiKey) {
        (request as AuthenticatedFastifyRequest).authContext = {
          ecosystemId: cachedValidApiKey.ecosystemId,
          publicKey: '',
        };
        return;
      }
    } catch (error) {
      request.log.warn({ error }, 'Redis API key cache unavailable while reading');
    }

    const cachedInvalid = invalidApiKeyCache.get(cacheKey);

    if (cachedInvalid && cachedInvalid.expiresAt > currentTs) {
      reply.code(401).send({
        error: 'API_KEY_INVALID',
        message: 'API key is invalid',
      });
      return;
    }

    if (cachedInvalid && cachedInvalid.expiresAt <= currentTs) {
      invalidApiKeyCache.delete(cacheKey);
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

    if (!validationResult.valid || !validationResult.ecosystemId) {
      invalidApiKeyCache.set(cacheKey, {
        expiresAt: currentTs + negativeTtlMs,
      });
      reply.code(401).send({
        error: 'API_KEY_INVALID',
        message: 'API key is invalid',
      });
      return;
    }

    invalidApiKeyCache.delete(cacheKey);
    try {
      await apiKeyCache.set(cacheKey, {
        ecosystemId: validationResult.ecosystemId,
      });
    } catch (error) {
      request.log.warn({ error }, 'Redis API key cache unavailable while writing');
    }

    (request as AuthenticatedFastifyRequest).authContext = {
      ecosystemId: validationResult.ecosystemId,
      publicKey: '',
    };
  };

  const broadcastTelemetryMock = async (
    hash: string,
    signature: string,
    publicKey: string,
    ecosystemId: string,
  ): Promise<{ txId: string }> => {
    // TODO: Replace with actual FireFly communication
    // This is a temporary mock that simulates network delay and returns success
    await new Promise((resolve) => setTimeout(resolve, 500));
    const txId = `mock-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    app.log.info({
      msg: '[MOCK] Broadcast to FireFly',
      hash,
      signature: signature.slice(0, 20) + '...',
      publicKey: publicKey.slice(0, 20) + '...',
      ecosystemId,
      txId,
    });
    return { txId };
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
      const publicKey = authContext?.publicKey;

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

      // Step 4: Calculate SHA-256 hash (payload + GPS)
      const hash = buildPayloadHash(payload, request.body.latitude, request.body.longitude);

      // Step 3: Persist with PENDING_ANCHOR status
      const savedTelemetry = await telemetryStore.save({
        ecosystemId,
        latitude: request.body.latitude,
        longitude: request.body.longitude,
        payload,
        hash,
        timestamp: eventTimestamp,
      });

      // Step 5: Request signature from auth-service (KMS)
      let signature: string;
      let signingPublicKey: string;

      try {
        const signResponse = await fetch(config.authSignUrl!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.authInternalToken}`,
          },
          body: JSON.stringify({ ecosystemId, hash }),
        });

        if (!signResponse.ok) {
          throw new Error(`Sign request failed: ${signResponse.status}`);
        }

        const signResult = await signResponse.json() as { signature: string; publicKey: string };
        signature = signResult.signature;
        signingPublicKey = signResult.publicKey;
      } catch (signError) {
        request.log.error({ error: signError }, 'Failed to get signature from auth-service');
        await telemetryStore.updateAnchorStatus(savedTelemetry.id, 'FAILED', '', '');
        return reply.code(500).send({
          error: 'SIGNING_FAILED',
          message: 'Failed to sign telemetry data',
        });
      }

      // Step 7: Broadcast to FireFly (mock)
      let txId: string;
      try {
        const broadcastResult = await broadcastTelemetryMock(hash, signature, signingPublicKey, ecosystemId);
        txId = broadcastResult.txId;
      } catch (broadcastError) {
        request.log.error({ error: broadcastError }, 'Failed to broadcast to FireFly');
        await telemetryStore.updateAnchorStatus(savedTelemetry.id, 'FAILED', '', '');
        return reply.code(500).send({
          error: 'BROADCAST_FAILED',
          message: 'Failed to broadcast telemetry to blockchain',
        });
      }

      // Step 8: Update status to ANCHORED
      await telemetryStore.updateAnchorStatus(savedTelemetry.id, 'ANCHORED', signature, signingPublicKey, txId);

      // Run device discovery in background (not part of the 8-step flow, but needed)
      void Promise.resolve().then(async () => {
        await deviceDiscovery.discoverAndSync(
          {
            ecosystemId,
            devices: request.body.devices,
          },
          request.log,
        );
      });

      return reply.code(202).send({
        ingestId: savedTelemetry.id,
        status: 'ACCEPTED',
        ecosystemId,
        hash,
        txId,
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
