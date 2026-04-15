import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

const decodeRsaKey = (rawValue: string | undefined, keyName: string): string => {
  if (!rawValue) {
    throw new Error(`${keyName} is not configured`);
  }

  if (rawValue.includes('BEGIN')) {
    return rawValue.replace(/\\n/g, '\n');
  }

  return Buffer.from(rawValue, 'base64').toString('utf8');
};

@Module({
  imports: [
    UsersModule,
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
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
