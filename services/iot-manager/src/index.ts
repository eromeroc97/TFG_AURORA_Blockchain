import 'dotenv/config';
import { createHash } from 'crypto';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { buildApiKeyCache, type ApiKeyCache } from './api-key-cache';
import { loadConfig, type AppConfig } from './config';
import { DeviceDiscoveryService } from './device-discovery';
import { MongoTelemetryStore, type TelemetryStore } from './telemetry-store';

/**
 * Resultado de validación de API key.
 */
type ApiKeyValidationResult = {
	/** Indica si la API key es válida */
	valid: boolean;
	/** ID del ecosistema (si es válida) */
	ecosystemId?: string;
};

/**
 * Datos de entrada para validar una API key.
 */
type ApiKeyValidationInput = {
	/** API key a validar */
	apiKey: string;
	/** Latitud de la lectura */
	latitude: number;
	/** Longitud de la lectura */
	longitude: number;
};

/**
 * Opciones para construir la aplicación Fastify.
 */
type AppOptions = {
	/** Configuración de la aplicación */
	config?: AppConfig;
	/** Almacenamiento de telemetría */
	telemetryStore?: TelemetryStore;
	/** Validador de API key personalizado */
	apiKeyValidator?: (input: ApiKeyValidationInput) => Promise<ApiKeyValidationResult>;
	/** Caché de API keys */
	apiKeyCache?: ApiKeyCache;
	/** TTL positivo en ms */
	positiveTtlMs?: number;
	/** TTL negativo en ms */
	negativeTtlMs?: number;
	/** Función para obtener timestamp actual */
	now?: () => number;
};

/**
 * Contexto de autenticación establecido por el middleware.
 */
type AuthContext = {
	/** ID del ecosistema */
	ecosystemId: string;
	/** Clave pública del firmante */
	publicKey: string;
};

type TelemetrySessionClaims = {
	sub?: string;
	role?: string | string[];
	roles?: string[];
	userId?: string;
	identityId?: string;
	ecosystemIds?: string[];
	ecosystems?: string[];
	userEcosystems?: string[];
};

type TelemetryRequestContext = {
	role: string;
	userId: string;
	ecosystemIds: string[] | null;
};

/**
 * Cuerpo de la solicitud de ingestión de telemetría.
 */
type IngestRequestBody = {
	/** Latitud de la lectura */
	latitude: number;
	/** Longitud de la lectura */
	longitude: number;
	/** Lista de dispositivos */
	devices: Array<{
		mac_addr: string;
		[key: string]: unknown;
	}>;
	/** Timestamp ISO-8601 (opcional) */
	timestamp?: string;
};

/**
 * Request de Fastify con contexto de autenticación.
 */
type AuthenticatedFastifyRequest = FastifyRequest & {
	/** Contexto de autenticación */
	authContext?: AuthContext;
};

const DEFAULT_POSITIVE_TTL_MS = 600_000;
const DEFAULT_NEGATIVE_TTL_MS = 15_000;

/**
 * Extrae la API key del header de la solicitud.
 *
 * @param request - Solicitud de Fastify
 * @returns API key o null si no existe
 */
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

/**
 * Calcula el hash SHA-256 de una API key para usarla como clave de caché.
 *
 * @param apiKey - API key en texto plano
 * @returns Hash hexadecimal
 */
const hashApiKey = (apiKey: string): string => createHash('sha256').update(apiKey).digest('hex');

/**
 * Ordena las claves de un objeto de forma estable para hashing consistente.
 *
 * @param value - Valor a ordenar
 * @returns Valor ordenado
 */
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

/**
 * Construye el hash SHA-256 del payload más coordenadas GPS.
 *
 * @param payload - Datos del sensor
 * @param latitude - Latitud
 * @param longitude - Longitud
 * @returns Hash hexadecimal
 */
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

/**
 * Parsea el mapa estático de API keys desde una variable de entorno.
 * Formato: "key1:ecosystemId1,key2:ecosystemId2" o JSON.
 *
 * @param raw - Valor de la variable de entorno
 * @returns Mapa de API keys a ecosistemas
 */
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

/**
 * Construye el validador de API key por defecto.
 * Intenta validación remota primero, luego mapa estático.
 *
 * @param config - Configuración de la aplicación
 * @returns Función validadora de API key
 */
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

/**
 * Construye la aplicación Fastify del IoT Manager.
 * Expone endpoints para ingestión de telemetría y discovery de dispositivos.
 *
 * Endpoints expuestos:
 * - GET /health - Health check
 * - GET /iot/devices/:deviceId/last-interaction - Última interacción de dispositivo
 * - POST /v1/ingest - Ingerir telemetría
 *
 * Propósito de seguridad:
 * - Valida API keys antes de procesar telemetría
 * - Hashea payloads con SHA-256
 * - Registra eventos en blockchain
 * - Usa caché para evitar validaciones repetidas
 *
 * @param options - Opciones de configuración
 * @returns Instancia de Fastify
 */
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

  app.options('/health', async (_, reply) => {
    reply
      .header('Access-Control-Allow-Origin', '*')
      .header('Access-Control-Allow-Methods', 'GET,OPTIONS')
      .header('Access-Control-Allow-Headers', 'Content-Type,Accept')
      .send()
  })

  app.get('/health', async (_, reply) => {
    reply
      .header('Access-Control-Allow-Origin', '*')
      .code(200)
      .send({
        status: 'UP',
        service: 'iot-manager',
      })
  })

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

  const telemetryMetricsHandler = async (request: FastifyRequest<{ Querystring: { range?: string } }>, reply: FastifyReply) => {
    const context = await resolveTelemetryRequestContext(request, reply);
    if (!context) {
      return;
    }

    const queryRange = request.query.range as string | undefined;
    const rangeMs: Record<string, number> = {
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
    };
    const range = queryRange && rangeMs[queryRange] ? rangeMs[queryRange] : 24 * 60 * 60 * 1000;

    const metrics = await telemetryStore.getMetrics({
      from: new Date(Date.now() - range),
      ecosystemIds: context.role === 'USER' ? context.ecosystemIds ?? [] : undefined,
    });

    return reply.code(200).send(metrics);
  };

  app.get('/v1/metrics', telemetryMetricsHandler);
  app.get('/api/telemetry/v1/metrics', telemetryMetricsHandler);

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

  const parseBase64Url = (value: string): string => {
    return value.replace(/-/g, '+').replace(/_/g, '/').padEnd(value.length + (4 - (value.length % 4)) % 4, '=');
  };

  const decodeJwtPayload = (token: string): TelemetrySessionClaims | null => {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const payloadSegment = parts[1];
      const decoded = Buffer.from(parseBase64Url(payloadSegment), 'base64').toString('utf8');
      return JSON.parse(decoded) as TelemetrySessionClaims;
    } catch {
      return null;
    }
  };

  const getBearerTokenFromHeader = (request: FastifyRequest): string | null => {
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string') {
      return null;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token.trim();
  };

  const normalizeEcosystemIds = (value: unknown): string[] | undefined => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
    }

    return undefined;
  };

  const resolveTelemetryRequestContext = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<TelemetryRequestContext | null> => {
    const token = getBearerTokenFromHeader(request);
    if (!token) {
      reply.code(401).send({
        error: 'AUTHORIZATION_REQUIRED',
        message: 'Authorization header with Bearer token is required',
      });
      return null;
    }

    const claims = decodeJwtPayload(token);
    if (!claims) {
      reply.code(401).send({
        error: 'INVALID_TOKEN',
        message: 'Unable to decode JWT payload',
      });
      return null;
    }

    const rawRole = claims.role ?? (claims.roles?.[0] ?? undefined);
    const role = typeof rawRole === 'string' ? rawRole.trim().toUpperCase() : undefined;
    const userId =
      (typeof claims.userId === 'string' && claims.userId.trim().length > 0 && claims.userId.trim()) ||
      (typeof claims.identityId === 'string' && claims.identityId.trim().length > 0 && claims.identityId.trim()) ||
      (typeof claims.sub === 'string' && claims.sub.trim().length > 0 && claims.sub.trim());

    if (!role || !userId) {
      reply.code(401).send({
        error: 'INVALID_SESSION_CLAIMS',
        message: 'Token payload must include role and userId/identityId/sub',
      });
      return null;
    }

    const claimEcosystemIds =
      normalizeEcosystemIds(claims.ecosystemIds) ??
      normalizeEcosystemIds(claims.ecosystems) ??
      normalizeEcosystemIds(claims.userEcosystems);

    let ecosystemIds: string[] | null = null;

    if (role === 'USER') {
      ecosystemIds = claimEcosystemIds ?? null;

      if (!ecosystemIds || ecosystemIds.length === 0) {
        if (!config.authUserEcosystemsUrl || !config.authInternalToken) {
          reply.code(403).send({
            error: 'USER_ECOSYSTEM_ACCESS_REQUIRED',
            message: 'User role requires ecosystem membership in token or auth service configuration',
          });
          return null;
        }

        try {
          const userEcosystemsResponse = await fetch(
            `${config.authUserEcosystemsUrl.replace(/\/$/, '')}/${encodeURIComponent(userId)}/ecosystems`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.authInternalToken}`,
              },
            },
          );

          if (!userEcosystemsResponse.ok) {
            throw new Error(`Unexpected status ${userEcosystemsResponse.status}`);
          }

          const data = (await userEcosystemsResponse.json()) as {
            ecosystemIds?: string[];
            ecosystems?: string[];
          };

          ecosystemIds = normalizeEcosystemIds(data.ecosystemIds) ?? normalizeEcosystemIds(data.ecosystems) ?? [];
        } catch (error) {
          request.log.error({ error }, 'Unable to fetch user ecosystems from auth service');
          reply.code(503).send({
            error: 'AUTH_SERVICE_UNAVAILABLE',
            message: 'Unable to resolve user ecosystems from auth service',
          });
          return null;
        }
      }

      if (!ecosystemIds || ecosystemIds.length === 0) {
        reply.code(403).send({
          error: 'NO_ECOSYSTEM_ACCESS',
          message: 'User has no associated ecosystems',
        });
        return null;
      }
    }

    return {
      role,
      userId,
      ecosystemIds,
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

/**
 * Inicia el servidor Fastify.
 */
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
