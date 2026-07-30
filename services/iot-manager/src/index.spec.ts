import { createHash } from 'crypto';
import { buildApp } from './index';
import type { AppConfig } from './config';
import type {
  SaveTelemetryInput,
  TelemetryMetricsQuery,
  TelemetryMetricsResult,
  TelemetryStore,
} from './telemetry-store';

const originalFetch = globalThis.fetch;
const fetchMock = jest.fn();

globalThis.fetch = fetchMock as unknown as typeof fetch;

const testConfig: AppConfig = {
  port: 3002,
  mongoUri: 'mongodb://mongo-db:27017/aurora_telemetry',
  fireflyApiUrl: 'http://localhost:5000/api/v1/namespaces/default',
  macVendorApiBaseUrl: 'https://api.macvendors.com',
  authSignUrl: 'http://auth-service:3001/internal/auth/sign',
  iotApiKeyPositiveTtlMs: 60_000,
  iotApiKeyNegativeTtlMs: 15_000,
};

const createMockTelemetryStore = (savedInputs: SaveTelemetryInput[]): TelemetryStore => {
  return {
    save: async (input) => {
      savedInputs.push(input)
      return { id: `mongo-${savedInputs.length}` }
    },
    updateAnchorStatus: async () => {
      return
    },
    findLastInteraction: async (deviceId: string) => {
      const found = [...savedInputs]
        .reverse()
        .find((input) =>
          Array.isArray((input.payload as any).devices) &&
          (input.payload as any).devices.some(
            (device: any) =>
              device?.id === deviceId ||
              device?.deviceId === deviceId ||
              device?.mac_addr === deviceId ||
              device?.mac_addr?.replace(/[^a-fA-F0-9]/g, '').toUpperCase() ===
                deviceId.replace(/[^a-fA-F0-9]/g, '').toUpperCase(),
          ),
        )

      return found?.timestamp ?? null
    },
    getMetrics: async () => ({
      dailyVolume: [],
      successRatio: [],
      ecosystemUsage: [],
      totalDevices: 0,
    }),
    findLatestPayload: async (macAddress: string, ecosystemId: string) => {
      const normalizedMac = macAddress.replace(/[^a-fA-F0-9]/g, '').toUpperCase()
      const found = savedInputs
        .slice()
        .reverse()
        .find(
          (input) =>
            Array.isArray((input.payload as any).devices) &&
            (input.payload as any).devices.some(
              (device: any) => {
                const deviceMac = (device?.mac_addr || '').replace(/[^a-fA-F0-9]/g, '').toUpperCase()
                return deviceMac === normalizedMac
              },
            ),
        )

      if (!found?.payload?.devices) {
        return null
      }

      const devicePayload = (found.payload as any).devices.find((device: any) => {
        const deviceMac = (device?.mac_addr || '').replace(/[^a-fA-F0-9]/g, '').toUpperCase()
        return deviceMac === normalizedMac
      })

      if (!devicePayload) {
        return null
      }

      const { mac_addr, ...rest } = devicePayload
      return rest
    },
    findById: async (id: string) => {
      return null
    },
    findPendingAnchors: async () => {
      return []
    },
    close: async () => {
      return
    },
    getVolumeByEcosystemIds: async (ecosystemIds: string[]) => {
      return savedInputs
        .filter((input) => ecosystemIds.includes(input.ecosystemId))
        .reduce((sum, input) => sum + (input.sizeBytes ?? 0), 0)
    },
  }
}

const createJwtToken = (payload: Record<string, unknown>): string => {
  const base64UrlEncode = (value: string) =>
    Buffer.from(value, 'utf8')
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  return `eyJhbGciOiJub25lIn0.${base64UrlEncode(JSON.stringify(payload))}.`
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (url: string | URL) => {
    const urlStr = String(url);
    if (urlStr.includes('/apis/') && urlStr.includes('/invoke/')) {
      return {
        ok: true,
        json: async () => ({ id: 'mock-op-id-123', tx: 'mock-tx-id-456' }),
      } as Response
    }
    return {
      ok: true,
      json: async () => ({ signature: 'mock-signature', publicKey: 'mock-public-key' }),
    } as Response
  })
})

afterAll(() => {
  globalThis.fetch = originalFetch
})

describe('IoT manager smoke tests', () => {
  it('/health (GET) should return UP', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'UP',
      service: 'iot-manager',
    });

    await app.close();
  });

  it('/v1/ingest (POST) should require x-api-key header', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });
    const response = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      payload: {
        latitude: 39.8568,
        longitude: -4.0245,
        devices: [],
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'API_KEY_REQUIRED',
      message: 'x-api-key header is required',
    });

    await app.close();
  });

  it('/v1/ingest (POST) should reject invalid api keys', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
      apiKeyValidator: async () => ({ valid: false }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'x-api-key': 'AUR-invalid',
      },
      payload: {
        latitude: 39.8568,
        longitude: -4.0245,
        devices: [],
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'API_KEY_INVALID',
      message: 'API key is invalid',
    });

    await app.close();
  });

  it('/v1/ingest (POST) should accept valid active ecosystem api keys', async () => {
    const savedInputs: SaveTelemetryInput[] = [];
    const telemetryStore = createMockTelemetryStore(savedInputs);
    const requestPayload = {
      latitude: 39.8568,
      longitude: -4.0245,
      devices: [
        {
          mac_addr: 'AA:BB:CC:DD:EE:FF',
          model: 'ESP32-WROOM-32',
          vendor: 'Espressif',
        },
      ],
    };

    const app = buildApp({
      config: testConfig,
      telemetryStore,
      apiKeyValidator: async () => ({
        valid: true,
        ecosystemId: 'eco-123',
        did: 'did:firefly:custom/eco-123',
        status: 'ACTIVE',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'x-api-key': 'AUR-valid',
      },
      payload: {
        latitude: requestPayload.latitude,
        longitude: requestPayload.longitude,
        devices: requestPayload.devices,
        timestamp: '2026-04-21T10:00:00.000Z',
      },
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();

    expect(body).toEqual(
      expect.objectContaining({
        status: 'ACCEPTED',
        ecosystemId: 'eco-123',
        ingestId: 'mongo-1',
        receivedAt: expect.any(String),
      }),
    );
    expect(savedInputs).toHaveLength(1);
    expect(body.hash).toBe(savedInputs[0].hash);
    expect(savedInputs[0]).toEqual(
      expect.objectContaining({
        ecosystemId: 'eco-123',
        latitude: 39.8568,
        longitude: -4.0245,
        payload: {
          devices: requestPayload.devices,
        },
        timestamp: new Date('2026-04-21T10:00:00.000Z'),
      }),
    );

    await app.close();
  });

  it('/v1/ingest (POST) should forward apiKey latitude and longitude to auth validation', async () => {
    let capturedInput:
      | {
          apiKey: string;
          latitude: number;
          longitude: number;
        }
      | null = null;

    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
      apiKeyValidator: async (input) => {
        capturedInput = input;
        return {
          valid: true,
          ecosystemId: 'eco-forward',
          did: 'did:firefly:custom/eco-forward',
          status: 'ACTIVE',
        };
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'x-api-key': 'AUR-forward',
      },
      payload: {
        latitude: 40.0,
        longitude: -3.7,
        devices: [],
      },
    });

    expect(response.statusCode).toBe(202);
    expect(capturedInput).toEqual({
      apiKey: 'AUR-forward',
      latitude: 40.0,
      longitude: -3.7,
    });

    await app.close();
  });

  it('/iot/devices/last-interaction (GET) should reject missing query parameters', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/iot/devices/last-interaction?macAddress=AA:BB:CC:DD:EE:FF',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'INVALID_REQUEST',
      message: 'macAddress and ecosystemId query parameters are required',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should require bearer authorization', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'AUTHORIZATION_REQUIRED',
      message: 'Authorization header with Bearer token is required',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should reject invalid JWT payload', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: 'Bearer invalid.token.parts',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'INVALID_TOKEN',
      message: 'Unable to decode JWT payload',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should resolve user ecosystems via auth service when missing in token', async () => {
    const telemetryStore = createMockTelemetryStore([]);
    telemetryStore.getMetrics = jest.fn<Promise<TelemetryMetricsResult>, [TelemetryMetricsQuery]>(async () => ({
      dailyVolume: [{ hour: '12', tx: 7 }],
      successRatio: [{ name: 'ANCHORED', value: 90 }],
      ecosystemUsage: [{ name: 'eco-user', anchors: 3 }],
      totalDevices: 4,
    }));

    const configWithUserEcosystems = {
      ...testConfig,
      authUserEcosystemsUrl: 'http://auth-service:3001/internal/users',
      authInternalToken: 'internal-token',
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ecosystemIds: ['eco-user'] }),
    } as any);

    const app = buildApp({
      config: configWithUserEcosystems,
      telemetryStore,
    });

    const token = createJwtToken({
      sub: 'user-2',
      role: 'USER',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      dailyVolume: [{ hour: '12', tx: 7 }],
      successRatio: [{ name: 'ANCHORED', value: 90 }],
      ecosystemUsage: [{ name: 'eco-user', anchors: 3 }],
      totalDevices: 4,
    });
    expect(telemetryStore.getMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ ecosystemIds: ['eco-user'] }),
    );

    await app.close();
  });

  it('/v1/ingest (POST) should return 500 when auth signing fails and mark telemetry as failed', async () => {
    const savedInputs: SaveTelemetryInput[] = [];
    const telemetryStore = createMockTelemetryStore(savedInputs);
    const updateAnchorStatusSpy = jest.spyOn(telemetryStore, 'updateAnchorStatus');

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as any);

    const app = buildApp({
      config: testConfig,
      telemetryStore,
      apiKeyValidator: async () => ({
        valid: true,
        ecosystemId: 'eco-500',
        did: 'did:firefly:custom/eco-500',
        status: 'ACTIVE',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'x-api-key': 'AUR-sign-fail',
      },
      payload: {
        latitude: 39.8568,
        longitude: -4.0245,
        devices: [],
      },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: 'SIGNING_FAILED',
      message: 'Failed to sign telemetry data',
    });
    expect(updateAnchorStatusSpy).toHaveBeenCalledWith('mongo-1', 'FAILED', '', '');

    await app.close();
  });

  it('/iot/devices/:deviceId/last-interaction (GET) should reject blank device ids', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/iot/devices/ /last-interaction',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'INVALID_DEVICE_ID',
      message: 'deviceId param is required',
    });

    await app.close();
  });

  it('/iot/devices/last-interaction (GET) should reject blank macAddress query param', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/iot/devices/last-interaction?macAddress=%20&ecosystemId=eco-123',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'INVALID_REQUEST',
      message: 'macAddress and ecosystemId query parameters are required',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should reject unauthorized malformed bearer token', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: 'Bearer invalid.token.payload',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'INVALID_TOKEN',
      message: 'Unable to decode JWT payload',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should reject authorization header missing bearer scheme', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: 'Token abc.def.ghi',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'AUTHORIZATION_REQUIRED',
      message: 'Authorization header with Bearer token is required',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should reject invalid token with only one dot', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: 'Bearer header.payload',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'INVALID_TOKEN',
      message: 'Unable to decode JWT payload',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should reject malformed token with empty payload', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const token = 'header..signature';

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'INVALID_TOKEN',
      message: 'Unable to decode JWT payload',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should reject malformed token with invalid base64 payload', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const token = 'header.not-base64.signature';

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'INVALID_TOKEN',
      message: 'Unable to decode JWT payload',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should reject user token without ecosystem membership when auth service not configured', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const token = createJwtToken({
      sub: 'user-no-ecosystems',
      role: 'USER',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: 'USER_ECOSYSTEM_ACCESS_REQUIRED',
      message: 'User role requires ecosystem membership in token or auth service configuration',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should accept admin token with roles array claim', async () => {
    const telemetryStore = createMockTelemetryStore([]);
    telemetryStore.getMetrics = jest.fn<Promise<TelemetryMetricsResult>, [TelemetryMetricsQuery]>(async () => ({
      dailyVolume: [{ hour: '11', tx: 1 }],
      successRatio: [{ name: 'ANCHORED', value: 100 }],
      ecosystemUsage: [{ name: 'eco-admin', anchors: 5 }],
      totalDevices: 1,
    }));

    const app = buildApp({
      config: testConfig,
      telemetryStore,
    });

    const token = createJwtToken({
      sub: 'admin-user',
      roles: ['ADMIN'],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      dailyVolume: [{ hour: '11', tx: 1 }],
      successRatio: [{ name: 'ANCHORED', value: 100 }],
      ecosystemUsage: [{ name: 'eco-admin', anchors: 5 }],
      totalDevices: 1,
    });

    await app.close();
  });

  it('/v1/metrics (GET) should accept admin token with identityId claim', async () => {
    const telemetryStore = createMockTelemetryStore([]);
    telemetryStore.getMetrics = jest.fn<Promise<TelemetryMetricsResult>, [TelemetryMetricsQuery]>(async () => ({
      dailyVolume: [{ hour: '09', tx: 3 }],
      successRatio: [{ name: 'ANCHORED', value: 99 }],
      ecosystemUsage: [{ name: 'eco-identity', anchors: 2 }],
      totalDevices: 2,
    }));

    const app = buildApp({
      config: testConfig,
      telemetryStore,
    });

    const token = createJwtToken({
      role: 'ADMIN',
      identityId: 'identity-1',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      dailyVolume: [{ hour: '09', tx: 3 }],
      successRatio: [{ name: 'ANCHORED', value: 99 }],
      ecosystemUsage: [{ name: 'eco-identity', anchors: 2 }],
      totalDevices: 2,
    });

    await app.close();
  });

  it('/v1/metrics (GET) should reject malformed auth service response for user ecosystems lookup', async () => {
    const configWithUserEcosystems = {
      ...testConfig,
      authUserEcosystemsUrl: 'http://auth-service:3001/internal/users',
      authInternalToken: 'internal-token',
    };

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as any);

    const app = buildApp({
      config: configWithUserEcosystems,
      telemetryStore: createMockTelemetryStore([]),
    });

    const token = createJwtToken({
      sub: 'user-fetch-fail',
      role: 'USER',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: 'AUTH_SERVICE_UNAVAILABLE',
      message: 'Unable to resolve user ecosystems from auth service',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should resolve user ecosystems list on auth service lookup', async () => {
    const telemetryStore = createMockTelemetryStore([]);
    telemetryStore.getMetrics = jest.fn<Promise<TelemetryMetricsResult>, [TelemetryMetricsQuery]>(async () => ({
      dailyVolume: [{ hour: '13', tx: 8 }],
      successRatio: [{ name: 'ANCHORED', value: 95 }],
      ecosystemUsage: [{ name: 'eco-user-fetch', anchors: 4 }],
      totalDevices: 5,
    }));

    const configWithUserEcosystems = {
      ...testConfig,
      authUserEcosystemsUrl: 'http://auth-service:3001/internal/users',
      authInternalToken: 'internal-token',
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ecosystemIds: ['eco-user-fetch'] }),
    } as any);

    const app = buildApp({
      config: configWithUserEcosystems,
      telemetryStore,
    });

    const token = createJwtToken({
      sub: 'user-fetch-ok',
      role: 'USER',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(telemetryStore.getMetrics).toHaveBeenCalledWith(
      expect.objectContaining({ ecosystemIds: ['eco-user-fetch'] }),
    );

    await app.close();
  });

  it('/v1/metrics (GET) should reject tokens missing scheme', async () => {
    const token = createJwtToken({
      sub: 'admin-no-scheme',
      role: 'ADMIN',
    });

    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: token,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: 'AUTHORIZATION_REQUIRED',
      message: 'Authorization header with Bearer token is required',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should allow admin token when roles claim is lowercase admin', async () => {
    const telemetryStore = createMockTelemetryStore([]);
    telemetryStore.getMetrics = jest.fn<Promise<TelemetryMetricsResult>, [TelemetryMetricsQuery]>(async () => ({
      dailyVolume: [{ hour: '14', tx: 2 }],
      successRatio: [{ name: 'ANCHORED', value: 100 }],
      ecosystemUsage: [{ name: 'eco-lower-admin', anchors: 1 }],
      totalDevices: 1,
    }));

    const app = buildApp({
      config: testConfig,
      telemetryStore,
    });

    const token = createJwtToken({
      sub: 'admin-lower-case',
      role: 'admin',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('/v1/ingest (POST) should use positive cache to avoid repetitive auth validations', async () => {
    let validationCalls = 0;
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
      positiveTtlMs: 60_000,
      apiKeyValidator: async () => {
        validationCalls += 1;
        return { valid: true, ecosystemId: 'eco-cache', did: 'did:firefly:custom/eco-cache', status: 'ACTIVE' };
      },
    });

    const requestPayload = {
      latitude: 39.8568,
      longitude: -4.0245,
      devices: [
        {
          mac_addr: 'AA:BB:CC:DD:EE:10',
          name: 'Sensor Temp',
        },
      ],
    };

    const firstResponse = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'x-api-key': 'AUR-cache-valid',
      },
      payload: requestPayload,
    });

    const secondResponse = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'x-api-key': 'AUR-cache-valid',
      },
      payload: requestPayload,
    });

    expect(firstResponse.statusCode).toBe(202);
    expect(secondResponse.statusCode).toBe(202);
    expect(validationCalls).toBe(1);

    await app.close();
  });

  it('/v1/ingest (POST) should accept empty devices array', async () => {
    const savedInputs: SaveTelemetryInput[] = [];
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore(savedInputs),
      apiKeyValidator: async () => ({
        valid: true,
        ecosystemId: 'eco-456',
        did: 'did:firefly:custom/eco-456',
        status: 'ACTIVE',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'x-api-key': 'AUR-empty-devices',
      },
      payload: {
        latitude: 38.994,
        longitude: -1.856,
        devices: [],
      },
    });

    expect(response.statusCode).toBe(202);
    expect(savedInputs).toHaveLength(1);
    expect(savedInputs[0]).toEqual(
      expect.objectContaining({
        latitude: 38.994,
        longitude: -1.856,
        payload: {
          devices: [],
        },
      }),
    );

    await app.close();
  });

  it('/v1/ingest (POST) should reject devices without mac_addr', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
      apiKeyValidator: async () => ({
        valid: true,
        ecosystemId: 'eco-789',
        did: 'did:firefly:custom/eco-789',
        status: 'ACTIVE',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'x-api-key': 'AUR-invalid-device',
      },
      payload: {
        latitude: 39.0,
        longitude: -3.9,
        devices: [{ model: 'No MAC device' }],
      },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('/iot/devices/:deviceId/last-interaction (GET) should return the last interaction timestamp if available', async () => {
    const savedInputs: SaveTelemetryInput[] = [
      {
        ecosystemId: 'eco-123',
        latitude: 39.0,
        longitude: -4.0,
        payload: {
          devices: [
            {
              id: 'device-abc',
              mac_addr: 'AA:BB:CC:DD:EE:FF',
            },
          ],
        },
        hash: 'hash-1',
        timestamp: new Date('2026-04-21T10:00:00.000Z'),
      },
      {
        ecosystemId: 'eco-123',
        latitude: 39.0,
        longitude: -4.0,
        payload: {
          devices: [
            {
              id: 'device-abc',
              mac_addr: 'AA:BB:CC:DD:EE:FF',
            },
          ],
        },
        hash: 'hash-2',
        timestamp: new Date('2026-04-21T10:05:00.000Z'),
      },
    ];

    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore(savedInputs),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/iot/devices/device-abc/last-interaction',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      lastInteractionAt: '2026-04-21T10:05:00.000Z',
    });

    await app.close();
  });

  it('/iot/devices/last-interaction (GET) should return the last interaction timestamp for a MAC + ecosystem', async () => {
    const savedInputs: SaveTelemetryInput[] = [
      {
        ecosystemId: 'eco-123',
        latitude: 39.0,
        longitude: -4.0,
        payload: {
          devices: [
            {
              mac_addr: 'AA:BB:CC:DD:EE:FF',
            },
          ],
        },
        hash: 'hash-1',
        timestamp: new Date('2026-04-21T10:00:00.000Z'),
      },
      {
        ecosystemId: 'eco-123',
        latitude: 39.0,
        longitude: -4.0,
        payload: {
          devices: [
            {
              mac_addr: 'AA:BB:CC:DD:EE:FF',
            },
          ],
        },
        hash: 'hash-2',
        timestamp: new Date('2026-04-21T10:05:00.000Z'),
      },
    ];

    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore(savedInputs),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/iot/devices/last-interaction?macAddress=AA:BB:CC:DD:EE:FF&ecosystemId=eco-123',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      lastInteractionAt: '2026-04-21T10:05:00.000Z',
    });

    await app.close();
  });

  it('/iot/devices/:deviceId/last-interaction (GET) should return null when no interaction exists', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/iot/devices/missing-device/last-interaction',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      lastInteractionAt: null,
    });

    await app.close();
  });

  it('/health (OPTIONS) should return CORS headers', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-methods']).toBe('GET,OPTIONS');
    expect(response.headers['access-control-allow-headers']).toBe('Content-Type,Accept');

    await app.close();
  });

  it('/health (GET) should return correct service status', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'UP',
      service: 'iot-manager',
    });

    await app.close();
  });

  it('/v1/metrics (GET) should reject when ecosystem filter is empty string', async () => {
    const configWithUserEcosystems = {
      ...testConfig,
      authUserEcosystemsUrl: 'http://auth-service:3001/internal/users',
      authInternalToken: 'internal-token',
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ecosystems: [] }),
    } as any);

    const app = buildApp({
      config: configWithUserEcosystems,
      telemetryStore: createMockTelemetryStore([]),
    });

    const token = createJwtToken({
      sub: 'user-empty-ecosystems',
      role: 'USER',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/metrics?ecosystemIds=',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(403);

    await app.close();
  });

  it('/iot/devices/:deviceId/last-interaction (GET) should reject missing deviceId', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/iot/devices/%20/last-interaction',
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('/iot/devices/last-interaction (GET) should reject empty macAddress', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/iot/devices/last-interaction?macAddress=%20&ecosystemId=eco-123',
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('/iot/devices/last-interaction (GET) should reject empty ecosystemId', async () => {
    const app = buildApp({
      config: testConfig,
      telemetryStore: createMockTelemetryStore([]),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/iot/devices/last-interaction?macAddress=AA:BB:CC:DD:EE:FF&ecosystemId=%20',
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
