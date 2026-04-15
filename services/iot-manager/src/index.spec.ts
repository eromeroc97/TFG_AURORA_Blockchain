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
});
