import { BadRequestException } from '@nestjs/common';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;
  const originalKey = process.env.CRYPTO_MASTER_KEY;
  const masterKey = Buffer.alloc(32, 1).toString('base64');

  beforeEach(() => {
    process.env.CRYPTO_MASTER_KEY = masterKey;
    service = new CryptoService();
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.CRYPTO_MASTER_KEY;
    } else {
      process.env.CRYPTO_MASTER_KEY = originalKey;
    }
  });

  it('should generate a valid Ed25519 key pair and verify a signature', () => {
    const { publicKey, privateKey } = service.generateKeyPair();
    const payload = 'hello-world';

    const signature = service.sign(payload, privateKey);
    expect(typeof signature).toBe('string');
    expect(service.verify(payload, signature, publicKey)).toBe(true);
  });

  it('should encrypt and decrypt a private key payload', () => {
    const rawPayload = 'my-secret-private-key';
    const encrypted = service.encryptPrivateKey(rawPayload);

    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();

    const decrypted = service.decryptPrivateKey(encrypted);
    expect(decrypted).toBe(rawPayload);
  });

  it('hashSha256 should return a deterministic hash', () => {
    expect(service.hashSha256('foo')).toBe(
      '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    );
  });

  it('should throw when CRYPTO_MASTER_KEY is missing', () => {
    delete process.env.CRYPTO_MASTER_KEY;
    expect(() => new CryptoService()).toThrow('CRYPTO_MASTER_KEY environment variable is not defined');
    process.env.CRYPTO_MASTER_KEY = masterKey;
  });
});
