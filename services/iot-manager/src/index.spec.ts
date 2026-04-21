import { createHash } from 'crypto';
import { buildApp } from './index';
import type { AppConfig } from './config';
import type { SaveTelemetryInput, TelemetryStore } from './telemetry-store';

const testConfig: AppConfig = {
  port: 3002,
  mongoUri: 'mongodb://mongo-db:27017/aurora_telemetry',
  fireflyApiUrl: 'http://localhost:5000/api/v1/namespaces/default',
  iotApiKeyPositiveTtlMs: 60_000,
  iotApiKeyNegativeTtlMs: 15_000,
};

const createMockTelemetryStore = (savedInputs: SaveTelemetryInput[]): TelemetryStore => ({
  save: async (input) => {
    savedInputs.push(input);
    return { id: `mongo-${savedInputs.length}` };
  },
  close: async () => {
    return;
  },
});

const buildExpectedPayloadHash = (payload: Record<string, unknown>): string => {
  const stableSort = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(stableSort);
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
          acc[key] = stableSort(nestedValue);
          return acc;
        }, {});
    }

    return value;
  };

  return createHash('sha256').update(JSON.stringify(stableSort(payload))).digest('hex');
};

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
    const payload = {
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
        latitude: payload.latitude,
        longitude: payload.longitude,
        devices: payload.devices,
        timestamp: '2026-04-21T10:00:00.000Z',
      },
    });

    const expectedHash = buildExpectedPayloadHash(payload);

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual(
      expect.objectContaining({
        status: 'ACCEPTED',
        ecosystemId: 'eco-123',
        ingestId: 'mongo-1',
        hash: expectedHash,
        receivedAt: expect.any(String),
      }),
    );
    expect(savedInputs).toHaveLength(1);
    expect(savedInputs[0]).toEqual(
      expect.objectContaining({
        ecosystemId: 'eco-123',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        payload,
        hash: expectedHash,
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
    expect(savedInputs[0].macAddress).toBeNull();

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
});
