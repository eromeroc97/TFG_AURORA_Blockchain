import { FireFlyService, AnchorTelemetryDto } from './firefly-service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FireFlyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FIREFLY_API_URL;
    delete process.env.FIREFLY_API_NAME;
    delete process.env.FIREFLY_METHOD_NAME;
    delete process.env.FIREFLY_NAMESPACE;
  });

  describe('loadFireFlyConfig', () => {
    it('throws when FIREFLY_API_URL is missing', () => {
      expect(() => new FireFlyService()).toThrow('FIREFLY_API_URL is required');
    });

    it('throws when FIREFLY_API_NAME is missing', () => {
      process.env.FIREFLY_API_URL = 'http://localhost';
      expect(() => new FireFlyService()).toThrow('FIREFLY_API_NAME is required');
    });

    it('throws when FIREFLY_METHOD_NAME is missing', () => {
      process.env.FIREFLY_API_URL = 'http://localhost';
      process.env.FIREFLY_API_NAME = 'my-api';
      expect(() => new FireFlyService()).toThrow('FIREFLY_METHOD_NAME is required');
    });

    it('loads config with all required variables', () => {
      process.env.FIREFLY_API_URL = 'http://localhost:5000';
      process.env.FIREFLY_API_NAME = 'aurora-api';
      process.env.FIREFLY_METHOD_NAME = 'AnchorTelemetry';
      process.env.FIREFLY_NAMESPACE = 'custom-ns';

      const service = new FireFlyService();
      expect((service as any).config).toEqual({
        apiUrl: 'http://localhost:5000',
        apiName: 'aurora-api',
        methodName: 'AnchorTelemetry',
        namespace: 'custom-ns',
      });
    });

    it('defaults namespace to default', () => {
      process.env.FIREFLY_API_URL = 'http://localhost:5000';
      process.env.FIREFLY_API_NAME = 'aurora-api';
      process.env.FIREFLY_METHOD_NAME = 'AnchorTelemetry';

      const service = new FireFlyService();
      expect((service as any).config.namespace).toBe('default');
    });
  });

  describe('anchorTelemetry', () => {
    it('throws on network error', async () => {
      process.env.FIREFLY_API_URL = 'http://localhost:5000';
      process.env.FIREFLY_API_NAME = 'aurora-api';
      process.env.FIREFLY_METHOD_NAME = 'AnchorTelemetry';

      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const service = new FireFlyService();
      const dto: AnchorTelemetryDto = {
        ingestId: 'ingest-1',
        ecosystemId: 'eco-1',
        telemetryHash: 'hash-123',
        signature: 'sig-123',
        publicKey: 'pub-123',
      };

      await expect(service.anchorTelemetry(dto)).rejects.toThrow('ECONNREFUSED');
    });

    it('throws on non-ok response', async () => {
      process.env.FIREFLY_API_URL = 'http://localhost:5000';
      process.env.FIREFLY_API_NAME = 'aurora-api';
      process.env.FIREFLY_METHOD_NAME = 'AnchorTelemetry';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error message'),
      } as any);

      const service = new FireFlyService();
      const dto: AnchorTelemetryDto = {
        ingestId: 'ingest-1',
        ecosystemId: 'eco-1',
        telemetryHash: 'hash-123',
        signature: 'sig-123',
        publicKey: 'pub-123',
      };

      await expect(service.anchorTelemetry(dto)).rejects.toThrow('FireFly invoke failed: 500 Internal Server Error');
    });

    it('throws when response body cannot be read', async () => {
      process.env.FIREFLY_API_URL = 'http://localhost:5000';
      process.env.FIREFLY_API_NAME = 'aurora-api';
      process.env.FIREFLY_METHOD_NAME = 'AnchorTelemetry';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: jest.fn().mockRejectedValue(new Error('Cannot read')),
      } as any);

      const service = new FireFlyService();
      const dto: AnchorTelemetryDto = {
        ingestId: 'ingest-1',
        ecosystemId: 'eco-1',
        telemetryHash: 'hash-123',
        signature: 'sig-123',
        publicKey: 'pub-123',
      };

      await expect(service.anchorTelemetry(dto)).rejects.toThrow('FireFly invoke failed: 500 Server Error');
    });

    it('throws when response lacks id field', async () => {
      process.env.FIREFLY_API_URL = 'http://localhost:5000';
      process.env.FIREFLY_API_NAME = 'aurora-api';
      process.env.FIREFLY_METHOD_NAME = 'AnchorTelemetry';

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ status: 'success' }),
      } as any);

      const service = new FireFlyService();
      const dto: AnchorTelemetryDto = {
        ingestId: 'ingest-1',
        ecosystemId: 'eco-1',
        telemetryHash: 'hash-123',
        signature: 'sig-123',
        publicKey: 'pub-123',
      };

      await expect(service.anchorTelemetry(dto)).rejects.toThrow('FireFly response missing operation ID');
    });

    it('returns txId on success', async () => {
      process.env.FIREFLY_API_URL = 'http://localhost:5000';
      process.env.FIREFLY_API_NAME = 'aurora-api';
      process.env.FIREFLY_METHOD_NAME = 'AnchorTelemetry';

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'tx-abc-123' }),
      } as any);

      const service = new FireFlyService();
      const dto: AnchorTelemetryDto = {
        ingestId: 'ingest-1',
        ecosystemId: 'eco-1',
        telemetryHash: 'hash-123',
        signature: 'sig-123',
        publicKey: 'pub-123',
      };

      const result = await service.anchorTelemetry(dto);
      expect(result).toBe('tx-abc-123');
    });
  });
});