import 'dotenv/config';
import { createHash, randomUUID } from 'crypto';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';

type ApiKeyValidationResult = {
  valid: boolean;
  ecosystemId?: string;
  status?: string;
};

type AppOptions = {
  apiKeyValidator?: (apiKey: string) => Promise<ApiKeyValidationResult>;
  positiveTtlMs?: number;
  negativeTtlMs?: number;
  now?: () => number;
};

type CachedApiKeyValidation =
  | {
      kind: 'valid';
      ecosystemId: string;
      expiresAt: number;
    }
  | {
      kind: 'invalid';
      expiresAt: number;
    };

type AuthContext = {
  ecosystemId: string;
};

type AuthenticatedFastifyRequest = FastifyRequest & {
  authContext?: AuthContext;
};

const DEFAULT_POSITIVE_TTL_MS = 60_000;
const DEFAULT_NEGATIVE_TTL_MS = 15_000;

const parseEnvNumber = (rawValue: string | undefined): number | null => {
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

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

const parseStaticMap = (): Record<string, string> => {
  const raw = process.env.IOT_API_KEY_STATIC_MAP;

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof key === 'string' && typeof value === 'string' && key.trim() && value.trim()) {
        acc[key] = value;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const buildDefaultApiKeyValidator = () => {
  const validationUrl = process.env.AUTH_VALIDATE_API_KEY_URL;
  const internalToken = process.env.AUTH_INTERNAL_TOKEN;
  const staticMap = parseStaticMap();

  return async (apiKey: string): Promise<ApiKeyValidationResult> => {
    if (validationUrl) {
      const response = await fetch(validationUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(internalToken ? { authorization: `Bearer ${internalToken}` } : {}),
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        throw new Error(`Auth API key validation failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ApiKeyValidationResult;
      return payload;
    }

    const ecosystemId = staticMap[apiKey];
    if (ecosystemId) {
      return {
        valid: true,
        ecosystemId,
        status: 'ACTIVE',
      };
    }

    return { valid: false };
  };
};

export const buildApp = (options: AppOptions = {}) => {
  const app = Fastify({ logger: true });

  const apiKeyValidator = options.apiKeyValidator ?? buildDefaultApiKeyValidator();
  const positiveTtlFromEnv = parseEnvNumber(process.env.IOT_API_KEY_POSITIVE_TTL_MS);
  const negativeTtlFromEnv = parseEnvNumber(process.env.IOT_API_KEY_NEGATIVE_TTL_MS);
  const positiveTtlMs = options.positiveTtlMs ?? positiveTtlFromEnv ?? DEFAULT_POSITIVE_TTL_MS;
  const negativeTtlMs = options.negativeTtlMs ?? negativeTtlFromEnv ?? DEFAULT_NEGATIVE_TTL_MS;
  const now = options.now ?? (() => Date.now());
  const apiKeyValidationCache = new Map<string, CachedApiKeyValidation>();

  app.get('/health', async () => {
    return {
      status: 'UP',
      service: 'iot-manager',
    };
  });

  const authenticateApiKey = async (request: FastifyRequest, reply: FastifyReply) => {
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
        (request as AuthenticatedFastifyRequest).authContext = { ecosystemId: cached.ecosystemId };
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
      validationResult = await apiKeyValidator(apiKey);
    } catch (error) {
      request.log.error({ error }, 'API key validation provider is unavailable');
      reply.code(503).send({
        error: 'AUTH_PROVIDER_UNAVAILABLE',
        message: 'API key validation provider is unavailable',
      });
      return;
    }

    if (!validationResult.valid || !validationResult.ecosystemId) {
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
      expiresAt: currentTs + positiveTtlMs,
    });
    (request as AuthenticatedFastifyRequest).authContext = { ecosystemId: validationResult.ecosystemId };
  };

  app.post(
    '/v1/ingest',
    {
      preHandler: authenticateApiKey,
      schema: {
        body: {
          type: 'object',
          required: ['ts', 'gatewayId', 'measurements'],
          properties: {
            ts: { type: 'string', minLength: 1 },
            gatewayId: { type: 'string', minLength: 1 },
            measurements: {
              type: 'object',
              additionalProperties: true,
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
      },
    },
    async (request, reply) => {
      const ecosystemId = (request as AuthenticatedFastifyRequest).authContext?.ecosystemId;

      if (!ecosystemId) {
        return reply.code(401).send({
          error: 'UNAUTHENTICATED_REQUEST',
          message: 'Authentication context is missing',
        });
      }

      return reply.code(202).send({
        ingestId: randomUUID(),
        status: 'ACCEPTED',
        ecosystemId,
        receivedAt: new Date(now()).toISOString(),
      });
    },
  );

  return app;
};

const start = async () => {
  const app = buildApp();
  const listenPort = parseEnvNumber(process.env.PORT) ?? 3002;

  try {
    await app.listen({
      port: listenPort,
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
