import { DeviceDiscoveryService } from './device-discovery';
import type { AppConfig } from './config';

type MockResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
};

const createResponse = (input: {
  ok: boolean;
  status?: number;
  text?: string;
  json?: unknown;
}): MockResponse => ({
  ok: input.ok,
  status: input.status ?? (input.ok ? 200 : 500),
  text: async () => input.text ?? '',
  json: async () => input.json ?? {},
});

describe('DeviceDiscoveryService', () => {
  const baseConfig: AppConfig = {
    port: 3002,
    mongoUri: 'mongodb://mongo-db:27017/aurora_telemetry',
    fireflyApiUrl: 'http://localhost:5000/api/v1/namespaces/default',
    macVendorApiBaseUrl: 'https://api.macvendors.com',
    authDeviceLookupUrl: 'http://auth-service:3001/internal/auth/devices/exists',
    authDeviceRegisterUrl: 'http://auth-service:3001/internal/auth/devices/register',
    authInternalToken: 'internal-token',
    iotApiKeyPositiveTtlMs: 600_000,
    iotApiKeyNegativeTtlMs: 15_000,
  };

  const logger = {
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers missing device with vendor from mac vendor api', async () => {
    const fetchMock = jest
      .fn<Promise<MockResponse>, [RequestInfo | URL, RequestInit | undefined]>()
      .mockResolvedValueOnce(createResponse({ ok: true, json: { exists: false } }))
      .mockResolvedValueOnce(createResponse({ ok: true, text: 'Espressif' }))
      .mockResolvedValueOnce(createResponse({ ok: true, status: 201 }));

    const service = new DeviceDiscoveryService(baseConfig, fetchMock as unknown as typeof fetch);

    await service.discoverAndSync(
      {
        ecosystemId: 'eco-1',
        devices: [{ mac_addr: 'aa:bb:cc:dd:ee:01', model: 'ESP32-WROOM-32' }],
      },
      logger,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      baseConfig.authDeviceLookupUrl,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.macvendors.com/AA%3ABB%3ACC%3ADD%3AEE%3A01',
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      baseConfig.authDeviceRegisterUrl,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          ecosystemId: 'eco-1',
          macAddress: 'AA:BB:CC:DD:EE:01',
          vendor: 'Espressif',
          preferredName: 'ESP32-WROOM-32',
        }),
      }),
    );
  });

  it('normalizes non-canonical mac address formats to canonical separator form', async () => {
    const fetchMock = jest
      .fn<Promise<MockResponse>, [RequestInfo | URL, RequestInit | undefined]>()
      .mockResolvedValueOnce(createResponse({ ok: true, json: { exists: false } }))
      .mockResolvedValueOnce(createResponse({ ok: true, status: 201 }));

    const service = new DeviceDiscoveryService(baseConfig, fetchMock as unknown as typeof fetch);

    await service.discoverAndSync(
      {
        ecosystemId: 'eco-1',
        devices: [{ mac_addr: 'aabb.ccdd.ee02', vendor: 'VendorB' }],
      },
      logger,
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      baseConfig.authDeviceLookupUrl,
      expect.objectContaining({
        body: JSON.stringify({
          ecosystemId: 'eco-1',
          macAddress: 'AA:BB:CC:DD:EE:02',
        }),
      }),
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      baseConfig.authDeviceRegisterUrl,
      expect.objectContaining({
        body: JSON.stringify({
          ecosystemId: 'eco-1',
          macAddress: 'AA:BB:CC:DD:EE:02',
          vendor: 'VendorB',
          preferredName: undefined,
        }),
      }),
    );
  });

  it('does not register when auth says device already exists', async () => {
    const fetchMock = jest
      .fn<Promise<MockResponse>, [RequestInfo | URL, RequestInit | undefined]>()
      .mockResolvedValue(createResponse({ ok: true, json: { exists: true } }));

    const service = new DeviceDiscoveryService(baseConfig, fetchMock as unknown as typeof fetch);

    await service.discoverAndSync(
      {
        ecosystemId: 'eco-1',
        devices: [{ mac_addr: 'aa:bb:cc:dd:ee:02', vendor: 'KnownVendor' }],
      },
      logger,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('deduplicates repeated mac addresses in the same payload', async () => {
    const fetchMock = jest
      .fn<Promise<MockResponse>, [RequestInfo | URL, RequestInit | undefined]>()
      .mockResolvedValueOnce(createResponse({ ok: true, json: { exists: false } }))
      .mockResolvedValueOnce(createResponse({ ok: true, status: 201 }));

    const service = new DeviceDiscoveryService(baseConfig, fetchMock as unknown as typeof fetch);

    await service.discoverAndSync(
      {
        ecosystemId: 'eco-1',
        devices: [
          { mac_addr: 'aa:bb:cc:dd:ee:03', vendor: 'VendorA' },
          { mac_addr: 'AA:BB:CC:DD:EE:03', vendor: 'VendorA' },
        ],
      },
      logger,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
