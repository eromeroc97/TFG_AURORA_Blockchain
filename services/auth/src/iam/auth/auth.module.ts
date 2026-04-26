import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { generateKeyPairSync } from 'crypto';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

let cachedTestKeys: { privateKey: string; publicKey: string } | null = null;

const getTestRsaKeys = () => {
  if (!cachedTestKeys) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    cachedTestKeys = { privateKey, publicKey };
  }

  return cachedTestKeys;
};

/**
 * Decodifica una clave RSA (pública o privada) desde una variable de entorno.
 * Soporta claves en formato PEM o codificadas en base64.
 * En entorno de test, genera claves RSA de forma automática.
 *
 * @param rawValue - Valor de la variable de entorno
 * @param keyName - Nombre de la variable de entorno (para mensajes de error)
 * @returns La clave decodificada en formato PEM
 * @throws Error si la clave no está configurada (excepto en test)
 */
const decodeRsaKey = (rawValue: string | undefined, keyName: string): string => {
  if (!rawValue) {
    if (process.env.NODE_ENV === 'test') {
      const testKeys = getTestRsaKeys();
      return keyName.includes('PUBLIC') ? testKeys.publicKey : testKeys.privateKey;
    }

    throw new Error(`${keyName} is not configured`);
  }

  if (rawValue.includes('BEGIN')) {
    return rawValue.replace(/\\n/g, '\n');
  }

  return Buffer.from(rawValue, 'base64').toString('utf8');
};

/**
 * Módulo de autenticación del sistema.
 * Configura e importa:
 * - **JwtModule**: Para generación y validación de tokens JWT (RS256)
 * - **UsersModule**: Para acceso a datos de usuarios
 * - **RedisModule**: Para blacklist de sesiones
 *
 * Proveedores exportados:
 * - AuthService: Servicio principal de autenticación
 * - JwtAuthGuard: Guard para autenticación JWT
 * - RolesGuard: Guard para control de acceso basado en roles (RBAC)
 *
 * @Module - Define el módulo de NestJS
 */
@Module({
  imports: [
    forwardRef(() => UsersModule),
    RedisModule,
    JwtModule.registerAsync({
      useFactory: async () => ({
        privateKey: decodeRsaKey(process.env.JWT_PRIVATE_KEY, 'JWT_PRIVATE_KEY'),
        publicKey: decodeRsaKey(process.env.JWT_PUBLIC_KEY, 'JWT_PUBLIC_KEY'),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '30m') as StringValue,
        },
        verifyOptions: {
          algorithms: ['RS256'],
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
