import { buildApp } from './index';

describe('IoT manager smoke tests', () => {
  it('/health (GET) should return UP', async () => {
    const app = buildApp();
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
    const app = buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      payload: {
        ts: '2026-04-21T10:00:00.000Z',
        gatewayId: 'gw-1',
        measurements: { temperature: 22.5 },
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
      apiKeyValidator: async () => ({ valid: false }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'x-api-key': 'AUR-invalid',
      },
      payload: {
        ts: '2026-04-21T10:00:00.000Z',
        gatewayId: 'gw-1',
        measurements: { temperature: 22.5 },
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
    const app = buildApp({
      apiKeyValidator: async () => ({ valid: true, ecosystemId: 'eco-123', status: 'ACTIVE' }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/ingest',
      headers: {
        'x-api-key': 'AUR-valid',
      },
      payload: {
        ts: '2026-04-21T10:00:00.000Z',
        gatewayId: 'gw-1',
        measurements: { temperature: 22.5 },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual(
      expect.objectContaining({
        status: 'ACCEPTED',
        ecosystemId: 'eco-123',
        ingestId: expect.any(String),
        receivedAt: expect.any(String),
      }),
    );

    await app.close();
  });

  it('/v1/ingest (POST) should use positive cache to avoid repetitive auth validations', async () => {
    let validationCalls = 0;
    const app = buildApp({
      positiveTtlMs: 60_000,
      apiKeyValidator: async () => {
        validationCalls += 1;
        return { valid: true, ecosystemId: 'eco-cache', status: 'ACTIVE' };
      },
    });

    const requestPayload = {
      ts: '2026-04-21T10:00:00.000Z',
      gatewayId: 'gw-cache',
      measurements: { humidity: 40 },
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
});
