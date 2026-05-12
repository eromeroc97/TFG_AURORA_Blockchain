import { loadConfig } from './config';

describe('config', () => {
  describe('parseRequiredString', () => {
    it('throws when value is undefined', () => {
      expect(() => loadConfig({})).toThrow('Missing required environment variable: MONGO_URI');
    });

    it('throws when value is empty string', () => {
      expect(() => loadConfig({ MONGO_URI: '', FIREFLY_API_URL: 'http://localhost' })).toThrow('Missing required environment variable: MONGO_URI');
    });

    it('throws when value is whitespace only', () => {
      expect(() => loadConfig({ MONGO_URI: '   ', FIREFLY_API_URL: 'http://localhost' })).toThrow('Missing required environment variable: MONGO_URI');
    });

    it('throws when FIREFLY_API_URL is missing', () => {
      expect(() => loadConfig({ MONGO_URI: 'mongodb://localhost' })).toThrow('Missing required environment variable: FIREFLY_API_URL');
    });
  });

  describe('parsePositiveNumber', () => {
    it('returns fallback for undefined value', () => {
      const env = { MONGO_URI: 'mongodb://localhost', FIREFLY_API_URL: 'http://localhost', PORT: undefined };
      const config = loadConfig(env);
      expect(config.port).toBe(3002);
    });

    it('returns fallback for empty string', () => {
      const env = { MONGO_URI: 'mongodb://localhost', FIREFLY_API_URL: 'http://localhost', PORT: '' };
      const config = loadConfig(env);
      expect(config.port).toBe(3002);
    });

    it('throws for non-numeric string', () => {
      const env = { MONGO_URI: 'mongodb://localhost', FIREFLY_API_URL: 'http://localhost', PORT: 'abc' };
      expect(() => loadConfig(env)).toThrow('Environment variable PORT must be a positive number');
    });

    it('throws for negative number', () => {
      const env = { MONGO_URI: 'mongodb://localhost', FIREFLY_API_URL: 'http://localhost', PORT: '-5' };
      expect(() => loadConfig(env)).toThrow('Environment variable PORT must be a positive number');
    });

    it('throws for zero', () => {
      const env = { MONGO_URI: 'mongodb://localhost', FIREFLY_API_URL: 'http://localhost', PORT: '0' };
      expect(() => loadConfig(env)).toThrow('Environment variable PORT must be a positive number');
    });

    it('throws for Infinity', () => {
      const env = { MONGO_URI: 'mongodb://localhost', FIREFLY_API_URL: 'http://localhost', PORT: 'Infinity' };
      expect(() => loadConfig(env)).toThrow('Environment variable PORT must be a positive number');
    });

    it('parses valid positive number', () => {
      const env = { MONGO_URI: 'mongodb://localhost', FIREFLY_API_URL: 'http://localhost', PORT: '8080' };
      const config = loadConfig(env);
      expect(config.port).toBe(8080);
    });
  });

  describe('loadConfig', () => {
    it('uses default values for optional fields', () => {
      const config = loadConfig({
        MONGO_URI: 'mongodb://localhost:27017',
        FIREFLY_API_URL: 'http://localhost:5000',
      });

      expect(config.fireflyNamespace).toBe('default');
      expect(config.iotApiKeyPositiveTtlMs).toBe(600_000);
      expect(config.iotApiKeyNegativeTtlMs).toBe(15_000);
      expect(config.macVendorApiBaseUrl).toBe('https://api.macvendors.com');
    });

    it('parses optional fields when provided', () => {
      const config = loadConfig({
        MONGO_URI: 'mongodb://localhost:27017',
        FIREFLY_API_URL: 'http://localhost:5000',
        FIREFLY_CONTRACT_ID: '  my-contract  ',
        FIREFLY_NAMESPACE: '  custom-ns  ',
        REDIS_URL: '  redis://localhost  ',
        AUTH_DEVICE_LOOKUP_URL: '  http://auth/lookup  ',
      });

      expect(config.fireflyContractId).toBe('my-contract');
      expect(config.fireflyNamespace).toBe('custom-ns');
      expect(config.redisUrl).toBe('redis://localhost');
      expect(config.authDeviceLookupUrl).toBe('http://auth/lookup');
    });

    it('sets optional fields to undefined when whitespace only', () => {
      const config = loadConfig({
        MONGO_URI: 'mongodb://localhost:27017',
        FIREFLY_API_URL: 'http://localhost:5000',
        FIREFLY_CONTRACT_ID: '   ',
        REDIS_URL: '   ',
      });

      expect(config.fireflyContractId).toBeUndefined();
      expect(config.redisUrl).toBeUndefined();
    });
  });
});