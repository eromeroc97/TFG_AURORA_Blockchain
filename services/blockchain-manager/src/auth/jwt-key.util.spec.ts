import { decodeRsaPublicKey, getJwtPublicKey } from './jwt-key.util';
import * as crypto from 'crypto';

const VALID_RSA_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo
4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u
+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh
kd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ
0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg
cKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc
mwIDAQAB
-----END PUBLIC KEY-----`;

describe('jwt-key.util', () => {
  describe('decodeRsaPublicKey', () => {
    it('should decode a valid PEM public key', () => {
      const result = decodeRsaPublicKey(VALID_RSA_KEY, 'TEST_KEY');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('BEGIN PUBLIC KEY');
    });

    it('should handle escaped newlines in PEM key', () => {
      const escapedKey = VALID_RSA_KEY.replace(/\n/g, '\\n');
      const result = decodeRsaPublicKey(escapedKey, 'TEST_KEY');
      expect(result).toBeDefined();
    });

    it('should handle CRLF line endings', () => {
      const crlfKey = VALID_RSA_KEY.replace(/\n/g, '\r\n');
      const result = decodeRsaPublicKey(crlfKey, 'TEST_KEY');
      expect(result).toBeDefined();
    });

    it('should decode base64 encoded key', () => {
      const base64Key = Buffer.from(VALID_RSA_KEY).toString('base64');
      const result = decodeRsaPublicKey(base64Key, 'TEST_KEY');
      expect(result).toBeDefined();
    });

    it('should throw error when key is undefined', () => {
      expect(() => decodeRsaPublicKey(undefined, 'JWT_PUBLIC_KEY'))
        .toThrow('JWT_PUBLIC_KEY is not configured');
    });

    it('should throw error when key is empty string', () => {
      expect(() => decodeRsaPublicKey('', 'JWT_PUBLIC_KEY'))
        .toThrow('JWT_PUBLIC_KEY is not configured');
    });

    it('should throw error for malformed key', () => {
      expect(() => decodeRsaPublicKey('not-a-valid-key', 'TEST_KEY'))
        .toThrow(/is malformed or not a valid RSA public key/);
    });

    it('should include key name in error message for missing key', () => {
      expect(() => decodeRsaPublicKey(undefined, 'MY_CUSTOM_KEY'))
        .toThrow('MY_CUSTOM_KEY is not configured');
    });
  });

  describe('getJwtPublicKey', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return decoded key when JWT_PUBLIC_KEY is set', () => {
      process.env.JWT_PUBLIC_KEY = VALID_RSA_KEY;
      const result = getJwtPublicKey();
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should throw error when JWT_PUBLIC_KEY is not set', () => {
      delete process.env.JWT_PUBLIC_KEY;
      expect(() => getJwtPublicKey())
        .toThrow('JWT_PUBLIC_KEY is not configured');
    });

    it('should throw error for malformed JWT_PUBLIC_KEY', () => {
      process.env.JWT_PUBLIC_KEY = 'invalid-key';
      expect(() => getJwtPublicKey())
        .toThrow(/is malformed or not a valid RSA public key/);
    });
  });
});