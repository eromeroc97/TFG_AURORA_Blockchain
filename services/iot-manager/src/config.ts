/**
 * Configuración de la aplicación IoT Manager.
 */
export type AppConfig = {
	/** Puerto del servidor */
	port: number;
	/** URI de conexión a MongoDB */
	mongoUri: string;
	/** URL de la API de FireFly (blockchain) */
	fireflyApiUrl: string;
	/** URL de conexión a Redis (opcional) */
	redisUrl?: string;
	/** URL base de la API de lookup de vendors MAC */
	macVendorApiBaseUrl: string;
	/** URL para verificar existencia de dispositivos (Auth) */
	authDeviceLookupUrl?: string;
	/** URL para registrar dispositivos (Auth) */
	authDeviceRegisterUrl?: string;
	/** URL para actualizar vendor de dispositivo (Auth) */
	authDeviceUpdateVendorUrl?: string;
	/** URL para validar API keys */
	authValidateApiKeyUrl?: string;
	/** URL para firmar hashes */
	authSignUrl?: string;
	/** Token interno para llamadas al Auth Service */
	authInternalToken?: string;
	/** Mapa estático de API keys (.Format: key1:id1,key2:id2) */
	iotApiKeyStaticMap?: string;
	/** TTL para cache positivo de API keys (ms) */
	iotApiKeyPositiveTtlMs: number;
	/** TTL para cache negativo de API keys (ms) */
	iotApiKeyNegativeTtlMs: number;
};

/**
 * Parsea una variable de entorno requerida.
 *
 * @param value - Valor a parsear
 * @param envName - Nombre de la variable para errores
 * @returns Valor trimmed
 * @throws Error si está vacía
 */
const parseRequiredString = (value: string | undefined, envName: string): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${envName}`);
  }

  return value.trim();
};

/**
 * Parsea un número positivo con fallback.
 *
 * @param value - Valor a parsear
 * @param fallback - Valor por defecto
 * @param envName - Nombre de la variable para errores
 * @returns Número positivo
 * @throws Error si es inválido
 */
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

/**
 * Carga la configuración desde variables de entorno.
 *
 * @param env - Objeto de variables de entorno (usa process.env por defecto)
 * @returns Objeto de configuración
 * @throws Error si faltan variables requeridas
 */
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
