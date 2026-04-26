import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard para autenticación JWT.
 * Extiende el guard estándar de Passport para validar tokens JWT.
 *
 * Propósito de seguridad:
 * - Verifica que el token JWT sea válido y no haya expirado
 * - Valida la firma del token con la clave pública RSA
 * - Se activa en endpoints que requieren autenticación
 *
 * @Injectable() - Proveído a nivel de módulo
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
/**
	 * Verifica que el token JWT sea válido.
	 * Delega en Passport para la validación real del token.
	 *
	 * @param context - Contexto de ejecución de NestJS
	 * @returns true si el token es válido
	 */
	canActivate(context: ExecutionContext) {
		return super.canActivate(context);
	}
}
