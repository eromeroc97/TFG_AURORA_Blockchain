import * as jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { generateKeyPairSync } from 'crypto';

/**
 * Helper para generar JWT tokens de prueba firmados con las claves RSA del .env
 * Simula exactamente cómo lo hace el sistema real en producción
 */

const decodeBase64OrPem = (rawValue: string | undefined): string => {
  if (!rawValue) {
    return '';
  }

  if (rawValue.includes('BEGIN')) {
    return rawValue.replace(/\\n/g, '\n');
  }

  return Buffer.from(rawValue, 'base64').toString('utf8');
};

export class JwtTestHelper {
  private static privateKey: string;
  private static publicKey: string;

  static initialize() {
    this.privateKey = decodeBase64OrPem(process.env.JWT_PRIVATE_KEY);
    this.publicKey = decodeBase64OrPem(process.env.JWT_PUBLIC_KEY);

    // Fallback para entornos de test sin variables JWT configuradas.
    if (!this.privateKey || !this.publicKey) {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      this.privateKey = privateKey;
      this.publicKey = publicKey;
    }
  }

  /**
   * Genera un token de acceso válido para tests
   * @param userId User ID
   * @param email Email del usuario
   * @param role Role del usuario
   * @param did DID del usuario (blockchain identity)
   * @returns Token JWT firmado
   */
  static generateAccessToken(
    userId: string,
    email: string,
    role: Role,
    did: string | null = null,
  ): string {
    if (!this.privateKey) this.initialize();

    const payload = {
      sub: userId,
      email,
      role,
      did,
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: '5m',
    });
  }

  /**
   * Genera un token expirado (para probar rechazo)
   */
  static generateExpiredToken(
    userId: string,
    email: string,
    role: Role,
    did: string | null = null,
  ): string {
    if (!this.privateKey) this.initialize();

    const payload = {
      sub: userId,
      email,
      role,
      did,
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: '-1s', // Expirado hace 1 segundo
    });
  }

  /**
   * Verifica que un token sea válido (para validar en tests)
   */
  static verifyToken(token: string): any {
    if (!this.publicKey) this.initialize();

    return jwt.verify(token, this.publicKey, {
      algorithms: ['RS256'],
    });
  }

  /**
   * Genera encabezado de autorización HTTP
   */
  static getBearerToken(token: string): string {
    return `Bearer ${token}`;
  }
}
