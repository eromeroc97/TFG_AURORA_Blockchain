import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../../redis/redis.service';
import { decodeRsaPublicKey } from '../jwt-key.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly redisService: RedisService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: decodeRsaPublicKey(process.env.JWT_PUBLIC_KEY, 'JWT_PUBLIC_KEY'),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const isBlacklisted = await this.redisService.isBlacklisted(payload.sub);
    if (isBlacklisted) {
      throw new UnauthorizedException('La sesión ha sido revocada o finalizada.');
    }

    return payload;
  }
}
