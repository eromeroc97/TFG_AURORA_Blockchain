import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { generateKeyPairSync } from 'crypto';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { BlockchainModule } from '../../blockchain/blockchain.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { decodeRsaPrivateKey, decodeRsaPublicKey } from './jwt-key.util';

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

const decodeRsaKey = (rawValue: string | undefined, keyName: string): string => {
  if (!rawValue) {
    if (process.env.NODE_ENV === 'test') {
      const testKeys = getTestRsaKeys();
      return keyName.includes('PUBLIC') ? testKeys.publicKey : testKeys.privateKey;
    }

    throw new Error(`${keyName} is not configured`);
  }

  if (keyName.includes('PUBLIC')) {
    return decodeRsaPublicKey(rawValue, keyName);
  }

  return decodeRsaPrivateKey(rawValue, keyName);
};

@Module({
  imports: [
    forwardRef(() => UsersModule),
    RedisModule,
    BlockchainModule,
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
