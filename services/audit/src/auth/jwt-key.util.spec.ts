import * as crypto from 'crypto';
import { decodeRsaPublicKey, getJwtPublicKey } from './jwt-key.util';

describe('jwt-key.util', () => {
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  describe('decodeRsaPublicKey', () => {
    it('should throw error when key is undefined', () => {
      expect(() => decodeRsaPublicKey(undefined, 'TEST_KEY')).toThrow(
        'TEST_KEY is not configured'
      );
    });

    it('should throw error when key is empty string', () => {
      expect(() => decodeRsaPublicKey('', 'TEST_KEY')).toThrow(
        'TEST_KEY is not configured'
      );
    });

    it('should throw error when key is malformed', () => {
      expect(() => decodeRsaPublicKey('not-a-valid-key', 'TEST_KEY')).toThrow(
        'TEST_KEY is malformed or not a valid RSA public key'
      );
    });

    it('should return key when PEM format is valid', () => {
      const result = decodeRsaPublicKey(publicKey, 'TEST_KEY');

      expect(result).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result).toContain('-----END PUBLIC KEY-----');
    });

    it('should handle key with escaped newlines and convert to proper PEM', () => {
      const escapedKey = publicKey.replace(/\n/g, '\\n').replace(/\r\n/g, '\\n');
      const result = decodeRsaPublicKey(escapedKey, 'TEST_KEY');

      expect(result).toContain('-----BEGIN PUBLIC KEY-----');
    });

    it('should handle base64 encoded key', () => {
      const base64Key = Buffer.from(publicKey).toString('base64');
      const result = decodeRsaPublicKey(base64Key, 'TEST_KEY');

      expect(result).toContain('-----BEGIN PUBLIC KEY-----');
    });
  });

  describe('getJwtPublicKey', () => {
    afterEach(() => {
      delete process.env.JWT_PUBLIC_KEY;
    });

    it('should read JWT_PUBLIC_KEY from environment', () => {
      process.env.JWT_PUBLIC_KEY = publicKey;

      const result = getJwtPublicKey();

      expect(result).toContain('-----BEGIN PUBLIC KEY-----');
    });

    it('should throw when JWT_PUBLIC_KEY is not set', () => {
      delete process.env.JWT_PUBLIC_KEY;

      expect(() => getJwtPublicKey()).toThrow('JWT_PUBLIC_KEY is not configured');
    });

    it('should throw when JWT_PUBLIC_KEY is malformed', () => {
      process.env.JWT_PUBLIC_KEY = 'not-a-valid-key';

      expect(() => getJwtPublicKey()).toThrow('JWT_PUBLIC_KEY is malformed');
    });
  });
});