import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtPublicKey } from './jwt-key.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: getJwtPublicKey(),
    });
  }

  async validate(payload: { sub: string; role: string }) {
    if (!payload.role) {
      throw new UnauthorizedException('Token inválido: sin rol');
    }
    return payload;
  }
}