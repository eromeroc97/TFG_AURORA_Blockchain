import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../../redis/redis.service';

const decodePublicKey = (rawValue: string | undefined): string => {
  if (!rawValue) {
    throw new Error('JWT_PUBLIC_KEY is not configured');
  }

  if (rawValue.includes('BEGIN')) {
    return rawValue.replace(/\\n/g, '\n');
  }

  return Buffer.from(rawValue, 'base64').toString('utf8');
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly redisService: RedisService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: decodePublicKey(process.env.JWT_PUBLIC_KEY),
    });
  }

  async validate(payload: { sub: string; email: string; role: string; did: string | null }) {
    const isBlacklisted = await this.redisService.isBlacklisted(payload.sub);
    if (isBlacklisted) {
      throw new UnauthorizedException('La sesión ha sido revocada o finalizada.');
    }

    return payload;
  }
}
