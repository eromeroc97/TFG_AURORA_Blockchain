import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  type KeyObject,
  sign as cryptoSign,
  verify as cryptoVerify,
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
    const keyPair = generateKeyPairSync('ed25519', {
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    if (!keyPair.publicKey || !keyPair.privateKey) {
      throw new Error('Failed to generate Ed25519 key pair');
    }

    const publicKeyPem = typeof keyPair.publicKey === 'string' 
      ? keyPair.publicKey 
      : (keyPair.publicKey as KeyObject).export({ type: 'spki', format: 'pem' });
    
    const privateKeyPem = typeof keyPair.privateKey === 'string'
      ? keyPair.privateKey
      : (keyPair.privateKey as KeyObject).export({ type: 'pkcs8', format: 'pem' });

    return {
      publicKey: publicKeyPem as string,
      privateKey: privateKeyPem as string,
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
    const privateKey = createPrivateKey(privateKeyPem);
    const signature = cryptoSign(null, Buffer.from(data, 'utf8'), privateKey);
    return signature.toString('base64');
  }

  verify(data: string, signatureBase64: string, publicKeyPem: string): boolean {
    const publicKey = createPublicKey(publicKeyPem);
    return cryptoVerify(null, Buffer.from(data, 'utf8'), publicKey, Buffer.from(signatureBase64, 'base64'));
  }

  hashSha256(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }
}