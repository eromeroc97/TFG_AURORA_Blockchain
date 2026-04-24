export type AppConfig = {
  port: number;
  mongoUri: string;
  fireflyApiUrl: string;
  redisUrl?: string;
  macVendorApiBaseUrl: string;
  authDeviceLookupUrl?: string;
  authDeviceRegisterUrl?: string;
  authDeviceUpdateVendorUrl?: string;
  authValidateApiKeyUrl?: string;
  authSignUrl?: string;
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
    redisUrl: env.REDIS_URL?.trim() || undefined,
    macVendorApiBaseUrl: env.MAC_VENDOR_API_BASE_URL?.trim() || 'https://api.macvendors.com',
    authDeviceLookupUrl: env.AUTH_DEVICE_LOOKUP_URL?.trim() || undefined,
    authDeviceRegisterUrl: env.AUTH_DEVICE_REGISTER_URL?.trim() || undefined,
    authDeviceUpdateVendorUrl: env.AUTH_DEVICE_UPDATE_VENDOR_URL?.trim() || undefined,
    authValidateApiKeyUrl: env.AUTH_VALIDATE_API_KEY_URL?.trim() || undefined,
    authSignUrl: env.AUTH_SIGN_URL?.trim() || undefined,
    authInternalToken: env.AUTH_INTERNAL_TOKEN?.trim() || undefined,
    iotApiKeyStaticMap: env.IOT_API_KEY_STATIC_MAP,
    iotApiKeyPositiveTtlMs: parsePositiveNumber(
      env.IOT_API_KEY_POSITIVE_TTL_MS,
      600_000,
      'IOT_API_KEY_POSITIVE_TTL_MS',
    ),
    iotApiKeyNegativeTtlMs: parsePositiveNumber(
      env.IOT_API_KEY_NEGATIVE_TTL_MS,
      15_000,
      'IOT_API_KEY_NEGATIVE_TTL_MS',
    ),
  };
};
