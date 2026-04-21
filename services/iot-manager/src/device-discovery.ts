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

const normalizeMacAddress = (macAddress: string): string => macAddress.trim().toUpperCase();

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

  private async resolveVendor(macAddress: string): Promise<string | undefined> {
    const macVendorApiBaseUrl = this.config.macVendorApiBaseUrl;

    if (!macVendorApiBaseUrl) {
      return undefined;
    }

    const response = await this.fetchImpl(`${macVendorApiBaseUrl}/${encodeURIComponent(macAddress)}`);
    if (!response.ok) {
      return undefined;
    }

    const vendor = (await response.text()).trim();
    return vendor.length > 0 ? vendor : undefined;
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
        if (exists) {
          continue;
        }

        const vendor = extractVendor(device) ?? (await this.resolveVendor(macAddress));
        const preferredName = extractPreferredName(device);

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
