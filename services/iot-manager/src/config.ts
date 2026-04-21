export type AppConfig = {
  port: number;
  mongoUri: string;
  fireflyApiUrl: string;
  authValidateApiKeyUrl?: string;
  authInternalToken?: string;
  iotApiKeyStaticMap?: string;
  iotApiKeyPositiveTtlMs: number;
  iotApiKeyNegativeTtlMs: number;
};

const parseRequiredString = (value: string | undefined, envName: string): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${envName}`);
  }

  return value.trim();
};

const parsePositiveNumber = (value: string | undefined, fallback: number, envName: string): number => {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${envName} must be a positive number`);
  }

  return parsed;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const mongoUri = parseRequiredString(env.MONGO_URI, 'MONGO_URI');
  const fireflyApiUrl = parseRequiredString(env.FIREFLY_API_URL, 'FIREFLY_API_URL');

  return {
    port: parsePositiveNumber(env.PORT, 3002, 'PORT'),
    mongoUri,
    fireflyApiUrl,
    authValidateApiKeyUrl: env.AUTH_VALIDATE_API_KEY_URL?.trim() || undefined,
    authInternalToken: env.AUTH_INTERNAL_TOKEN?.trim() || undefined,
    iotApiKeyStaticMap: env.IOT_API_KEY_STATIC_MAP,
    iotApiKeyPositiveTtlMs: parsePositiveNumber(
      env.IOT_API_KEY_POSITIVE_TTL_MS,
      60_000,
      'IOT_API_KEY_POSITIVE_TTL_MS',
    ),
    iotApiKeyNegativeTtlMs: parsePositiveNumber(
      env.IOT_API_KEY_NEGATIVE_TTL_MS,
      15_000,
      'IOT_API_KEY_NEGATIVE_TTL_MS',
    ),
  };
};
