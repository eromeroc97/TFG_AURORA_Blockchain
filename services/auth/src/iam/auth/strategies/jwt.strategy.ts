import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../../redis/redis.service';

/**
 * Decodifica la clave pública RSA desde la variable de entorno.
 *
 * @param rawValue - Valor de la variable de entorno JWT_PUBLIC_KEY
 * @returns La clave en formato PEM
 * @throws Error si la variable de entorno no está definida
 */
const decodePublicKey = (rawValue: string | undefined): string => {
  if (!rawValue) {
    throw new Error('JWT_PUBLIC_KEY is not configured');
  }

  if (rawValue.includes('BEGIN')) {
    return rawValue.replace(/\\n/g, '\n');
  }

  return Buffer.from(rawValue, 'base64').toString('utf8');
};

/**
 * Estrategia Passport para validación de tokens JWT.
 * Utiliza el algoritmo RS256 para verificar la firma de los tokens.
 *
 * Propósito de seguridad:
 * - Valida tokens JWT usando clave pública RSA
 * - Verifica que el token no haya expirado
 * - Consulta la blacklist de Redis para tokens revocados
 *
 * @Injectable() - Proveído a nivel de módulo
 */
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

  /**
	 * Valida el payload del token JWT después de la verificación de Passport.
	 * Verifica adicionalmente que el usuario no esté en la blacklist de sesiones revocadas.
	 *
	 * Propósito de seguridad:
	 * - Previene el uso de tokens de sesiones cerradas
	 * - Añade el user y role al objeto request para uso posterior
	 *
	 * @param payload - Payload decodificado del JWT (sub, email, role)
	 * @returns El payload + información del usuario
	 * @throws UnauthorizedException - Si el token está en la blacklist
	 * @async
	 */
	async validate(payload: { sub: string; email: string; role: string }) {
    const isBlacklisted = await this.redisService.isBlacklisted(payload.sub);
    if (isBlacklisted) {
      throw new UnauthorizedException('La sesión ha sido revocada o finalizada.');
    }

    return payload;
  }
}
