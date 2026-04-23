import type { AppConfig } from './config';

type DevicePayload = {
  mac_addr: string;
  model?: string;
  name?: string;
  vendor?: string;
};

type DeviceDiscoveryInput = {
  ecosystemId: string;
  devices: DevicePayload[];
};

type AuthDeviceLookupResponse = {
  exists: boolean;
};

type LoggerLike = {
  warn(payload: unknown, message: string): void;
};

const normalizeMacAddress = (macAddress: string): string => {
  const cleaned = macAddress.trim().replace(/[^a-fA-F0-9]/g, '').toUpperCase();

  if (!/^[A-F0-9]{12}$/.test(cleaned)) {
    throw new Error(`Invalid MAC address format: ${macAddress}`);
  }

  return cleaned.match(/.{2}/g)!.join(':');
};

const extractVendor = (device: DevicePayload): string | undefined => {
  if (typeof device.vendor !== 'string') {
    return undefined;
  }

  const vendor = device.vendor.trim();
  return vendor.length > 0 ? vendor : undefined;
};

const extractPreferredName = (device: DevicePayload): string | undefined => {
  if (typeof device.name === 'string' && device.name.trim().length > 0) {
    return device.name.trim();
  }

  if (typeof device.model === 'string' && device.model.trim().length > 0) {
    return device.model.trim();
  }

  return undefined;
};

export async function resolveMacVendor(
  macAddress: string,
  fetchImpl: typeof fetch = fetch,
  macVendorApiBaseUrl = 'https://api.macvendors.com',
): Promise<string> {
  const normalizedMac = macAddress.trim();

  try {
    const response = await fetchImpl(`${macVendorApiBaseUrl}/${encodeURIComponent(normalizedMac)}`);

    if (!response.ok) {
      return 'Generic Device';
    }

    const vendor = (await response.text()).trim();
    return vendor.length > 0 ? vendor : 'Generic Device';
  } catch {
    return 'Generic Device';
  }
}

export class DeviceDiscoveryService {
  constructor(
    private readonly config: AppConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private getInternalAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (this.config.authInternalToken) {
      headers.authorization = `Bearer ${this.config.authInternalToken}`;
    }

    return headers;
  }

  private async resolveVendor(macAddress: string): Promise<string> {
    const macVendorApiBaseUrl = this.config.macVendorApiBaseUrl;

    if (!macVendorApiBaseUrl) {
      return 'Generic Device';
    }

    return resolveMacVendor(macAddress, this.fetchImpl, macVendorApiBaseUrl);
  }

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
      const macAddress = normalizeMacAddress(device.mac_addr);

      if (seenMacAddresses.has(macAddress)) {
        continue;
      }
      seenMacAddresses.add(macAddress);

      try {
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
            macAddress,
          },
          'Device discovery sync failed for one device',
        );
      }
    }
  }
}
