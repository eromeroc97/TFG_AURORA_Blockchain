import type { AppConfig } from './config';

/**
 * Payload de un dispositivo descubierto.
 */
type DevicePayload = {
	/** Dirección MAC del dispositivo */
	mac_addr: string;
	/** Modelo del dispositivo (opcional) */
	model?: string;
	/** Nombre preferido (opcional) */
	name?: string;
	/** Vendor/fabricante (opcional) */
	vendor?: string;
};

/**
 * Datos de entrada para el servicio de descubrimiento.
 */
type DeviceDiscoveryInput = {
	/** ID del ecosistema */
	ecosystemId: string;
	/** Lista de dispositivos descubiertos */
	devices: DevicePayload[];
};

/**
 * Respuesta de verificación de existencia en Auth.
 */
type AuthDeviceLookupResponse = {
	/** Indica si el dispositivo existe */
	exists: boolean;
};

/**
 * Interfaz mínima de logger.
 */
type LoggerLike = {
	/** Método de warning */
	warn(payload: unknown, message: string): void;
};

/**
 * Normaliza una dirección MAC a formato canonico XX:XX:XX:XX:XX:XX.
 *
 * @param macAddress - MAC en cualquier formato
 * @returns MAC normalizada con dos puntos
 * @throws Error si el formato es inválido
 */
const normalizeMacAddress = (macAddress: string): string => {
  const cleaned = macAddress.trim().replace(/[^a-fA-F0-9]/g, '').toUpperCase();

  if (!/^[A-F0-9]{12}$/.test(cleaned)) {
    throw new Error(`Invalid MAC address format: ${macAddress}`);
  }

  return cleaned.match(/.{2}/g)!.join(':');
};

/**
 * Extrae el vendor del dispositivo si está definido.
 *
 * @param device - Payload del dispositivo
 * @returns Vendor normalizado o undefined
 */
const extractVendor = (device: DevicePayload): string | undefined => {
  if (typeof device.vendor !== 'string') {
    return undefined;
  }

  const vendor = device.vendor.trim();
  return vendor.length > 0 ? vendor : undefined;
};

/**
 * Extrae el nombre preferido del dispositivo.
 * Prioriza el nombre explícito, luego el modelo.
 *
 * @param device - Payload del dispositivo
 * @returns Nombre preferido o undefined
 */
const extractPreferredName = (device: DevicePayload): string | undefined => {
  if (typeof device.name === 'string' && device.name.trim().length > 0) {
    return device.name.trim();
  }

  if (typeof device.model === 'string' && device.model.trim().length > 0) {
    return device.model.trim();
  }

  return undefined;
};

/**
 * Resuelve el vendor de una MAC usando la API externa.
 * Realiza lookup para identificar fabricantes de dispositivos.
 *
 * Propósito de seguridad:
 * - Identifica fabricantes de dispositivos
 * - Proporciona metadatos para gestión de activos
 *
 * @param macAddress - Dirección MAC a resolver
 * @param fetchImpl - Implementación de fetch (para testing)
 * @param macVendorApiBaseUrl - URL base de la API de vendors
 * @returns Promise con el nombre del vendor
 */
export async function resolveMacVendor(
  macAddress: string,
  fetchImpl: typeof fetch = fetch,
  macVendorApiBaseUrl = 'https://api.macvendors.com',
): Promise<string> {
  const normalizedMac = macAddress.trim();

  try {
    const response = await fetchImpl(`${macVendorApiBaseUrl}/${encodeURIComponent(normalizedMac)}`, {
      signal: AbortSignal.timeout(5000),
      headers: {
        // Camuflamos la petición para que no la bloqueen por ser un bot/script
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/plain'
      }
    });

    if (!response.ok) {
      // ESTO ES CLAVE: Te chivará en consola si te están bloqueando por el límite (429) o si la MAC no existe (404)
      console.warn(`[MacVendor API] Fallo al resolver ${normalizedMac}. Código HTTP: ${response.status}`);
      return 'Generic Device';
    }

    const vendor = (await response.text()).trim();
    return vendor.length > 0 ? vendor : 'Generic Device';
    
  } catch (error) {
    // Si salta el timeout de 5000ms o hay un corte de red, lo verás aquí
    console.error(`[MacVendor API] Excepción con la MAC ${normalizedMac}:`, error);
    return 'Generic Device';
  }
}

/**
 * Servicio de descubrimiento y sincronización de dispositivos.
 * Se integra con el servicio Auth para registrar y actualizar dispositivos.
 *
 * Propósito de seguridad:
 * - Verifica existencia de dispositivos en Auth
 * - Registra dispositivos nuevos en el sistema de gestión
 * - Actualiza vendor de dispositivos conocidos
 *
 * @param config - Configuración de la aplicación
 * @param fetchImpl - Implementación de fetch (para testing)
 */
export class DeviceDiscoveryService {
  constructor(
    private readonly config: AppConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /**
   * Construye los headers para llamadas internas a Auth.
   *
   * @returns Headers con content-type y bearer token
   */
  private getInternalAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (this.config.authInternalToken) {
      headers.authorization = `Bearer ${this.config.authInternalToken}`;
    }

    return headers;
  }

  /**
   * Resuelve el vendor de una MAC usando la API externa.
   *
   * @param macAddress - Dirección MAC a resolver
   * @returns Promise con el nombre del vendor
   */
  private async resolveVendor(macAddress: string): Promise<string> {
    const macVendorApiBaseUrl = this.config.macVendorApiBaseUrl;

    if (!macVendorApiBaseUrl) {
      return 'Generic Device';
    }

    return resolveMacVendor(macAddress, this.fetchImpl, macVendorApiBaseUrl);
  }

  /**
   * Verifica si un dispositivo existe en Auth.
   *
   * @param ecosystemId - ID del ecosistema
   * @param macAddress - Dirección MAC del dispositivo
   * @returns Promise con true si existe
   */
  private async deviceExistsInAuth(ecosystemId: string, macAddress: string): Promise<boolean> {
    if (!this.config.authDeviceLookupUrl) {
      return false;
    }

    const response = await this.fetchImpl(this.config.authDeviceLookupUrl, {
      method: 'POST',
      headers: this.getInternalAuthHeaders(),
      body: JSON.stringify({
        ecosystemId,
        macAddress,
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth device lookup failed with status ${response.status}`);
    }

    const payload = (await response.json()) as AuthDeviceLookupResponse;
    return payload.exists === true;
  }

  /**
   * Registra un dispositivo nuevo en Auth.
   *
   * @param ecosystemId - ID del ecosistema
   * @param macAddress - Dirección MAC del dispositivo
   * @param vendor - Vendor del dispositivo
   * @param preferredName - Nombre preferido del dispositivo
   */
  private async registerDeviceInAuth(
    ecosystemId: string,
    macAddress: string,
    vendor: string | undefined,
    preferredName: string | undefined,
  ): Promise<void> {
    if (!this.config.authDeviceRegisterUrl) {
      return;
    }

    const response = await this.fetchImpl(this.config.authDeviceRegisterUrl, {
      method: 'POST',
      headers: this.getInternalAuthHeaders(),
      body: JSON.stringify({
        ecosystemId,
        macAddress,
        vendor,
        preferredName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth device register failed with status ${response.status}`);
    }
  }

  /**
   * Actualiza el vendor de un dispositivo existente en Auth.
   *
   * @param ecosystemId - ID del ecosistema
   * @param macAddress - Dirección MAC del dispositivo
   * @param vendor - Vendor actualizado
   */
  private async updateDeviceVendorInAuth(
    ecosystemId: string,
    macAddress: string,
    vendor: string,
  ): Promise<void> {
    if (!this.config.authDeviceUpdateVendorUrl) {
      return;
    }

    const response = await this.fetchImpl(this.config.authDeviceUpdateVendorUrl, {
      method: 'POST',
      headers: this.getInternalAuthHeaders(),
      body: JSON.stringify({
        ecosystemId,
        macAddress,
        vendor,
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth device vendor update failed with status ${response.status}`);
    }
  }

  async discoverAndSync(input: DeviceDiscoveryInput, logger: LoggerLike): Promise<void> {
    if (!this.config.authDeviceLookupUrl || !this.config.authDeviceRegisterUrl) {
      return;
    }

    const seenMacAddresses = new Set<string>();

    for (const device of input.devices) {
      try {
        const macAddress = normalizeMacAddress(device.mac_addr);

        if (seenMacAddresses.has(macAddress)) {
          continue;
        }
        seenMacAddresses.add(macAddress);

        const exists = await this.deviceExistsInAuth(input.ecosystemId, macAddress);
        const vendor = extractVendor(device) ?? (await this.resolveVendor(macAddress));
        const preferredName = extractPreferredName(device);

        if (exists) {
          await this.updateDeviceVendorInAuth(input.ecosystemId, macAddress, vendor);
          continue;
        }

        await this.registerDeviceInAuth(input.ecosystemId, macAddress, vendor, preferredName);
      } catch (error) {
        logger.warn(
          {
            error,
            ecosystemId: input.ecosystemId,
            macAddress: device.mac_addr,
          },
          'Device discovery sync failed for one device',
        );
      }
    }
  }
}
