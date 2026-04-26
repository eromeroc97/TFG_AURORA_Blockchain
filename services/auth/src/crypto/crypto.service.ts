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

/**
 * Interfaz que representa un par de claves criptográficas.
 */
export interface KeyPair {
	/** Clave pública en formato PEM */
	publicKey: string;
	/** Clave privada en formato PEM */
	privateKey: string;
}

/**
 * Interfaz que representa un payload cifrado con AES-256-GCM.
 */
export interface EncryptedPayload {
	/** Texto cifrado en formato base64 */
	ciphertext: string;
	/** Vector de inicialización en formato base64 */
	iv: string;
	/** Tag de autenticación en formato base64 */
	authTag: string;
}

/**
 * Servicio de criptografía del sistema.
 * Proporciona operaciones criptográficas para:
 * - **Ed25519**: Generación de pares de claves y firmas digitales
 * - **AES-256-GCM**: Cifrado simétrico de claves privadas
 * - **SHA-256**: Generación de hashes
 *
 * Propósito de seguridad:
 * - Cifrar claves privadas de usuarios antes de almacenarlas
 * - Firmar transacciones o mensajes con claves Ed25519
 * - Verificar la integridad de datos mediante firmas
 *
 * @Injectable() - Proveído a nivel de módulo
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly masterKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly authTagLength = 16;

  /**
   * Inicializa el servicio de criptografía.
   * Obtiene la clave maestra desde la variable de entorno CRYPTO_MASTER_KEY.
   *
   * Propósito de seguridad:
   * - Valida que la clave maestra tenga exactamente 32 bytes (256 bits)
   * - La clave debe estar codificada en base64
   *
   * @throws Error - Si la variable de entorno no está definida o tiene longitud inválida
   */
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

  /**
	 * Genera un par de claves asimétricas Ed25519.
	 *
	 * Propósito de seguridad:
	 * - Genera claves para firmas digitales de usuarios
	 * - El par incluye clave pública (para verificación) y privada (para firmar)
	 *
	 * @returns Interfaz KeyPair con las claves pública y privada en formato PEM
	 * @throws Error - Si la generación del par de claves falla
	 */
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

  /**
	 * Cifra una clave privada PEM utilizando AES-256-GCM.
	 *
	 * Propósito de seguridad:
	 * - Protege claves privadas antes de almacenarlas en la base de datos
	 * - Utiliza cifrado autenticado (GCM) que incluye tag de autenticación
	 * - Genera un IV único para cada operación de cifrado
	 *
	 * @param privateKeyPem - Clave privada en formato PEM a cifrar
	 * @returns Interfaz EncryptedPayload con el ciphertext, IV y authTag
	 */
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

  /**
	 * Descifra una clave privada utilizando AES-256-GCM.
	 *
	 * Propósito de seguridad:
	 * - Descifra claves privadas almacenadas de forma segura
	 * - Verifica la autenticidad mediante el authTag antes de retornar
	 *
	 * @param encryptedPayload - Objeto con ciphertext, IV y authTag
	 * @returns La clave privada en formato PEM descifrada
	 * @throws BadRequestException - Si el authTag no coincide (datos manipulados)
	 */
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

  /**
	 * Firma datos utilizando una clave privada Ed25519.
	 *
	 * Propósito de seguridad:
	 * - Crea una firma digital que prueba la identidad del firmante
	 * - Utiliza el algoritmo Ed25519 para firmas rápidas y seguras
	 *
	 * @param data - Datos a firmar (en formato texto)
	 * @param privateKeyPem - Clave privada en formato PEM
	 * @returns Firma digital en formato base64
	 */
	sign(data: string, privateKeyPem: string): string {
    const privateKey = createPrivateKey(privateKeyPem);
    const signature = cryptoSign(null, Buffer.from(data, 'utf8'), privateKey);
    return signature.toString('base64');
  }

  /**
	 * Verifica una firma digital Ed25519.
	 *
	 * Propósito de seguridad:
	 * - Confirma que los datos no han sido modificados
	 * - Verifica que la firma fue creada con la clave privada correspondiente
	 *
	 * @param data - Datos originales que fueron firmados
	 * @param signatureBase64 - Firma digital en formato base64
	 * @param publicKeyPem - Clave pública en formato PEM
	 * @returns true si la firma es válida, false en caso contrario
	 */
	verify(data: string, signatureBase64: string, publicKeyPem: string): boolean {
    const publicKey = createPublicKey(publicKeyPem);
    return cryptoVerify(null, Buffer.from(data, 'utf8'), publicKey, Buffer.from(signatureBase64, 'base64'));
  }

  /**
	 * Genera un hash SHA-256 de los datos proporcionados.
	 *
	 * Propósito de seguridad:
	 * - Utilizado para verificación de integridad de datos
	 * - No es réversible (función unidireccional)
	 *
	 * @param data - Datos a hashear
	 * @returns Hash en formato hexadecimal
	 */
	hashSha256(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }
}