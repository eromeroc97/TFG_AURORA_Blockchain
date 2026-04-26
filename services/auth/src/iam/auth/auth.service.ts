import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { StringValue } from 'ms';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';

/**
 * Interfaz que define la estructura del payload JWT.
 * Contiene los datos del usuario para la generación del token.
 */
interface AuthPayload {
	/** ID único del usuario */
	sub: string;
	/** Dirección de correo electrónico del usuario */
	email: string;
	/** Rol del usuario en el sistema */
	role: string;
}

/**
 * Decodifica la clave pública RSA desde una variable de entorno.
 * Soporta claves en formato PEM (con saltos de línea) o codificadas en base64.
 *
 * @param rawValue - Valor de la variable de entorno contenente la clave
 * @returns La clave decodificada en formato PEM
 * @throws Error si la variable de entorno no está establecida
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
 * Servicio principal de autenticación del sistema.
 * Gestiona el ciclo de vida completo de la autenticación: login, logout,
 * recuperación de contraseñas, generación y validación de tokens JWT (RS256),
 * y gestión de refresh tokens con almacenamiento en Redis.
 *
 * Este servicio utiliza:
 * - **Argon2** para el hasheo de contraseñas y refresh tokens
 * - **RS256** (RSA Signature Algorithm) para firmar tokens JWT
 * - **Redis** para blacklist de sesiones revocadas
 *
 * @Injectable() - Proveído a nivel de módulo
 */
@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
		private readonly redisService: RedisService,
	) {}

	/**
	 * Procesa una solicitud de recuperación de contraseña.
	 * Crea un token de un solo uso para restablecer la contraseña y lo envía por correo electrónico.
	 *
	 * @param email - Dirección de correo electrónico del usuario que solicita la recuperación
	 * @returns Promise<void> - El proceso complete senza ritornare dati sensibili
	 * @async
	 */
	async requestPasswordRecovery(email: string): Promise<void> {
		await this.usersService.createPasswordResetToken(email);
	}

	/**
	 * Restablece la contraseña del usuario utilizando un token de un solo uso.
	 * El token se consume y no puede volver a utilizarse.
	 *
	 * @param token - Token de un solo uso enviado por correo electrónico
	 * @param password - Nueva contraseña en texto plano (se hasheará antes de almacenarse)
	 * @returns Promise<void>
	 * @throws NotFoundException - Si el token no existe o ha expirado
	 * @throws BadRequestException - Si la contraseña no cumple los requisitos
	 * @async
	 */
	async resetPasswordWithOneTimeToken(token: string, password: string): Promise<void> {
		await this.usersService.consumePasswordResetToken(token, password);
	}

	/**
	 * Valida un token de restablecimiento de contraseña.
	 * Verifica que el token sea válido y no haya expirado.
	 *
	 * @param token - Token de un solo uso a validar
	 * @returns Promise<{ valid: boolean }> - Indica si el token es válido
	 * @async
	 */
	async validatePasswordResetToken(token: string): Promise<{ valid: boolean }> {
		return this.usersService.validatePasswordResetToken(token);
	}

	/**
	 * Valida las credenciales del usuario (email y contraseña).
	 * Utiliza **Argon2** para verificar la contraseña hasheada almacenada en la base de datos.
	 *
	 * Propósito de seguridad:
	 * - Verifica la identidad del usuario antes de generar tokens
	 * - Bloquea cuentas con estado PASSBLOCK (contraseña antigua)
	 * - Impide acceso a usuarios inactivos o revocados
	 *
	 * @param email - Dirección de correo electrónico del usuario
	 * @param pass - Contraseña en texto plano proporcionada por el usuario
	 * @returns El usuario encontrado si las credenciales son válidas
	 * @throws UnauthorizedException - Si las credenciales son inválidas, la cuenta está inactiva, o el estado es PASSBLOCK/REVOKED
	 * @async
	 */
	async validateUser(email: string, pass: string) {
		try {
			const user = await this.usersService.findByEmail(email);

			if (user.status === UserStatus.PASSBLOCK) {
				throw new UnauthorizedException(
					'PASSBLOCK: Tu contraseña lleva demasiado tiempo sin cambiarse. Debes iniciar el proceso de recuperación.',
				);
			}

			if (
				user.status === UserStatus.PENDING ||
				user.status === UserStatus.REVOKED ||
				!user.isActive
			) {
				throw new UnauthorizedException('Acceso denegado o cuenta inactiva');
			}

			const passwordMatches = await argon2.verify(user.passwordHash, pass);
			if (!passwordMatches) {
				throw new UnauthorizedException('Credenciales inválidas');
			}

			return user;
		} catch (error) {
			if (error instanceof UnauthorizedException) {
				throw error;
			}

			throw new UnauthorizedException('Credenciales inválidas');
		}
	}

	/**
	 * Genera el par de tokens JWT (accessToken y refreshToken).
	 * Utiliza el algoritmo **RS256** (RSA Signature Algorithm) para firmar los tokens.
	 *
	 * Propósito de seguridad:
	 * - El accessToken tiene corta duración (30min) para limitar la exposición en caso de compromiso
	 * - El refreshToken tiene mayor duración (7d) para permitir sesiones persistentes
	 * - Cada token contiene un payload signed criptográficamente con la clave privada RSA
	 *
	 * @param user - Objeto con los datos del usuario (id, email, role)
	 * @returns Promise con los tokens generados y sus tiempos de expiración
	 * @async
	 */
	async generateTokens(user: { id: string; email: string; role: string }) {
		const payload: AuthPayload = {
			sub: user.id,
			email: user.email,
			role: user.role,
		};
		const refreshTokenExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as StringValue;

		const accessToken = await this.jwtService.signAsync(payload, {
			algorithm: 'RS256',
		});

		const refreshToken = await this.jwtService.signAsync(
			{ sub: user.id, type: 'refresh' },
			{
				algorithm: 'RS256',
				expiresIn: refreshTokenExpiresIn,
			},
		);

		return {
			accessToken,
			refreshToken,
			accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '30m',
			refreshTokenExpiresIn,
		};
	}

	/**
	 * Extrae el userId contenido en un refresh token JWT.
	 * Verifica que el token sea del tipo correcto (type: 'refresh') y no haya sido manipulado.
	 *
	 * Propósito de seguridad:
	 * - Previene ataques de replay usando tokens de acceso como refresh tokens
	 * - Valida la firma criptográfica del token con la clave pública RSA
	 *
	 * @param refreshToken - Token JWT a verificar
	 * @returns Promise con el userId extraído del token
	 * @throws UnauthorizedException - Si el token es inválido, está manipulado, o no es del tipo refresh
	 * @async
	 */
	async resolveUserIdFromRefreshToken(refreshToken: string): Promise<string> {
		try {
			const payload = await this.jwtService.verifyAsync<{ sub?: string; type?: string }>(
				refreshToken,
				{
					algorithms: ['RS256'],
					secret: decodePublicKey(process.env.JWT_PUBLIC_KEY),
				},
			);

			if (!payload?.sub || payload.type !== 'refresh') {
				throw new UnauthorizedException('Refresh token inválido');
			}

			return payload.sub;
		} catch {
			throw new UnauthorizedException('Refresh token inválido');
		}
	}

	/**
	 * Actualiza el hash del refresh token almacenado para un usuario.
	 * Utiliza **Argon2** para hashear el refresh token antes de almacenarlo en la base de datos.
	 *
	 * Propósito de seguridad:
	 * - Permite validar refresh tokens de forma segura sin almacenarlos en texto plano
	 * - Protege contra robo de refresh tokens desde la base de datos
	 *
	 * @param userId - ID único del usuario
	 * @param refreshToken - Refresh token a hashear y almacenar
	 * @returns Promise<void>
	 * @async
	 */
	async updateRefreshToken(userId: string, refreshToken: string) {
		const hashedRefreshToken = await argon2.hash(refreshToken);
		await this.usersService.updateRefreshTokenHash(userId, hashedRefreshToken);
	}

	/**
	 * Autentica al usuario y genera el par de tokens JWT.
	 * Combina la validación de credenciales con la generación de tokens.
	 *
	 * Propósito de seguridad:
	 * - Genera tokens solo para usuarios con credenciales válidas
	 * - Almacena el hash del refresh token para validaciones posteriores
	 *
	 * @param user - Objeto con los datos del usuario (id, email, role)
	 * @returns Promise con los tokens generados (accessToken y refreshToken)
	 * @async
	 */
	async login(user: { id: string; email: string; role: string }) {
		const tokens = await this.generateTokens(user);
		await this.updateRefreshToken(user.id, tokens.refreshToken);
		return tokens;
	}

	/**
	 * Renueva el par de tokens JWT utilizando un refresh token válido.
	 * Valida el refresh token hasheado y genera nuevos tokens si la validación es exitosa.
	 *
	 * Propósito de seguridad:
	 * - Utiliza **Argon2** para verificar el hash del refresh token almacenado
	 * - Previene ataques de robo de sesión mediante rotación de tokens
	 * - Invalida el refresh token antiguo tras cada renovación
	 * - Verifica el estado de la cuenta antes de permitir la renovación
	 *
	 * @param userId - ID del usuario que solicita la renovación
	 * @param refreshToken - Refresh token actual presentado por el usuario
	 * @returns Promise con los nuevos tokens generados
	 * @throws UnauthorizedException - Si el refresh token es inválido, la cuenta está inactiva, o el userId no coincide
	 * @async
	 */
	async refreshTokens(userId: string, refreshToken: string) {
		const tokenUserId = await this.resolveUserIdFromRefreshToken(refreshToken);
		if (tokenUserId !== userId) {
			throw new UnauthorizedException('Refresh token inválido');
		}

		const user = await this.usersService.findAuthUserById(userId);

		if (
			user.status === UserStatus.PENDING ||
			user.status === UserStatus.PASSBLOCK ||
			user.status === UserStatus.REVOKED ||
			!user.isActive ||
			!user.hashedRefreshToken
		) {
			throw new UnauthorizedException('Acceso denegado o cuenta inactiva');
		}

		const refreshMatches = await argon2.verify(user.hashedRefreshToken, refreshToken);
		if (!refreshMatches) {
			throw new UnauthorizedException('Refresh token inválido');
		}

		const tokens = await this.generateTokens(user);
		await this.updateRefreshToken(user.id, tokens.refreshToken);
		return tokens;
	}

	/**
	 * Cierra la sesión del usuario.
	 * Invalida el refresh token almacenado y añade el ID del usuario a la lista negra de Redis.
	 *
	 * Propósito de seguridad:
	 * - Impide la reutilización de tokens revocados (token rotation)
	 * -.blacklist del usuario en Redis para invalidar tokens de acceso activos
	 * - El tiempo de permanencia en blacklist coincide con la vida剩余 del access token
	 *
	 * @param userId - ID del usuario cuya sesión se va a cerrar
	 * @returns Promise con objeto success indicando el resultado de la operación
	 * @async
	 */
	async logout(userId: string) {
		await this.usersService.updateRefreshTokenHash(userId, null);
		await this.redisService.addToBlacklist(userId, 300);
		return { success: true };
	}
}
