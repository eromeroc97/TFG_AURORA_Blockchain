import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  randomBytes,
  createHash,
  createSign,
  createVerify,
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  type KeyPairSyncResult,
} from 'crypto';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly masterKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly authTagLength = 16;

  constructor() {
    const masterKeyBase64 = process.env.CRYPTO_MASTER_KEY;
    if (!masterKeyBase64) {
      throw new Error('CRYPTO_MASTER_KEY environment variable is not defined');
    }

    try {
      this.masterKey = Buffer.from(masterKeyBase64, 'base64');
    } catch {
      throw new Error('CRYPTO_MASTER_KEY must be valid base64-encoded 32 bytes');
    }

    if (this.masterKey.length !== this.keyLength) {
      throw new Error(
        `CRYPTO_MASTER_KEY must be exactly ${this.keyLength} bytes (32 characters in base64)`,
      );
    }

    this.logger.log('CryptoService initialized with Ed25519 and AES-256-GCM');
  }

  generateKeyPair(): KeyPair {
    const keyPair = generateKeyPairSync('ed25519');

    if (!keyPair.publicKey || !keyPair.privateKey) {
      throw new Error('Failed to generate Ed25519 key pair');
    }

    return {
      publicKey: keyPair.publicKey.toString(),
      privateKey: keyPair.privateKey.toString(),
    };
  }

  encryptPrivateKey(privateKeyPem: string): EncryptedPayload {
    const iv = randomBytes(this.ivLength);

    const cipher = createCipheriv(this.algorithm, this.masterKey, iv, {
      authTagLength: this.authTagLength,
    });

    const encrypted = Buffer.concat([
      cipher.update(privateKeyPem, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  decryptPrivateKey(encryptedPayload: EncryptedPayload): string {
    const { ciphertext, iv, authTag } = encryptedPayload;

    const decipher = createDecipheriv(
      this.algorithm,
      this.masterKey,
      Buffer.from(iv, 'base64'),
    );

    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  sign(data: string, privateKeyPem: string): string {
    const signer = createSign('SHA256');
    signer.update(data, 'utf8');
    signer.end();
    const signature = signer.sign(privateKeyPem);
    return signature.toString('base64');
  }

  verify(data: string, signatureBase64: string, publicKeyPem: string): boolean {
    const verifier = createVerify('SHA256');
    verifier.update(data, 'utf8');
    verifier.end();
    return verifier.verify(publicKeyPem, Buffer.from(signatureBase64, 'base64'));
  }

  hashSha256(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }
}