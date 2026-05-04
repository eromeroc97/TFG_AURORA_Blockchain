import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly redisService: RedisService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKeyProvider: (request: any, rawJwtToken: string, done: Function) => {
        const publicKey = process.env.JWT_PUBLIC_KEY;
        if (!publicKey) {
          return done(new Error('JWT_PUBLIC_KEY is not configured'), null);
        }
        try {
          const key = publicKey.replace(/\\n/g, '\n');
          done(null, key);
        } catch (err) {
          done(err, null);
        }
      },
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const isBlacklisted = await this.redisService?.isBlacklisted(payload.sub);
    if (isBlacklisted) {
      throw new UnauthorizedException('La sesión ha sido revocada o finalizada.');
    }
    return payload;
  }
}
