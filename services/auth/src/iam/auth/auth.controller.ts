import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RecoverPasswordDto } from './dto/recover-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ValidateResetTokenDto } from './dto/validate-reset-token.dto';

const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Tipo definido para los tokens de autenticación expuestos al cliente.
 * No incluye el refreshToken en texto plano por seguridad.
 */
type PublicAuthTokens = {
	/** Token de acceso JWT para autenticación de solicitudes */
	accessToken: string;
	/** Tiempo de expiración del access token */
	accessTokenExpiresIn: string;
	/** Tiempo de expiración del refresh token */
	refreshTokenExpiresIn: string;
};

/**
 * Convierte una cadena de tiempo de expiración a milisegundos.
 * Soporta formatos: número directo (ej. "300000"),
 * o con unidad (ej. "30m" = 30 minutos, "7d" = 7 días).
 *
 * @param expiresIn - Cadena con el tiempo de expiración
 * @param fallbackMs - Valor por defecto en milisegundos si el formato no es válido
 * @returns El tiempo en milisegundos
 */
const parseExpiresToMs = (expiresIn: string | undefined, fallbackMs: number): number => {
	if (!expiresIn) {
		return fallbackMs;
	}

	const trimmed = expiresIn.trim();
	const directNumber = Number(trimmed);
	if (!Number.isNaN(directNumber)) {
		return directNumber;
	}

	const match = /^(\d+)\s*([smhd])$/i.exec(trimmed);
	if (!match) {
		return fallbackMs;
	}

	const value = Number(match[1]);
	const unit = match[2].toLowerCase();

	if (unit === 's') return value * 1000;
	if (unit === 'm') return value * 60 * 1000;
	if (unit === 'h') return value * 60 * 60 * 1000;
	if (unit === 'd') return value * 24 * 60 * 60 * 1000;

	return fallbackMs;
};

/**
 * Convierte una cadena a valor booleano.
 *
 * @param rawValue - Valor en forma de cadena a convertir
 * @param fallback - Valor por defecto si la conversión falla
 * @returns true si el valor es "true" (case-insensitive), false en caso contrario
 */
const parseBoolean = (rawValue: string | undefined, fallback: boolean): boolean => {
	if (!rawValue) {
		return fallback;
	}

	const normalized = rawValue.trim().toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;

	return fallback;
};

/**
 * Convierte el valor SameSite a uno válido.
 * Solo acepta 'strict', 'lax' o 'none'. Cualquier otro valor retorna 'lax'.
 *
 * @param rawValue - Valor SameSite de la variable de entorno
 * @returns Valor SameSite válido ('lax', 'strict' o 'none')
 */
const parseSameSite = (rawValue: string | undefined): 'lax' | 'strict' | 'none' => {
	const normalized = rawValue?.trim().toLowerCase();
	if (normalized === 'strict' || normalized === 'none') {
		return normalized;
	}

	return 'lax';
};

/**
 * Genera la política de cookies para el refresh token.
 * Lee las configuraciones de seguridad desde variables de entorno.
 *
 * @returns Objeto con la política de cookies (httpOnly, secure, sameSite, path)
 */
const getRefreshCookiePolicy = () => {
	const secure = parseBoolean(process.env.REFRESH_COOKIE_SECURE, false);
	const sameSite = parseSameSite(process.env.REFRESH_COOKIE_SAMESITE);

	return {
		httpOnly: true,
		secure,
		sameSite,
		path: '/',
	};
};

/**
 * Establece el cookie de refresh token en la respuesta.
 * Utiliza la política de cookies configurada para seguridad.
 *
 * Propósito de seguridad:
 * - Configura httpOnly: true para prevenir acceso desde JavaScript (XSS)
 * - Configura secure: true en producción para usar solo HTTPS
 * - Configura sameSite para prevenir CSRF
 *
 * @param res - Objeto de respuesta Express
 * @param refreshToken - Token JWT de renovación a almacenar en la cookie
 * @param expiresIn - Tiempo de expiración del token
 */
const setRefreshCookie = (res: Response, refreshToken: string, expiresIn: string | undefined) => {
	const policy = getRefreshCookiePolicy();
	res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
		...policy,
		maxAge: parseExpiresToMs(expiresIn, 24 * 60 * 60 * 1000),
	});
};

/**
 * Extrae las cookies del header de solicitud.
 *
 * @param req - Objeto de solicitud Express (opcional)
 * @returns Objeto con todas las cookies parseadas como pares clave-valor
 */
const parseCookies = (req?: Request): Record<string, string> => {
	const header = req?.headers?.cookie;
	if (!header) {
		return {};
	}

	return header
		.split(';')
		.map((chunk) => chunk.trim())
		.reduce<Record<string, string>>((acc, chunk) => {
			const [name, ...valueParts] = chunk.split('=');
			if (!name) {
				return acc;
			}

			acc[name] = decodeURIComponent(valueParts.join('='));
			return acc;
		}, {});
};

/**
 * Limpia las cookies de sesión de la respuesta.
 *
 * @param res - Objeto de respuesta Express
 */
const clearSessionCookies = (res: Response) => {
 	const refreshOptions = getRefreshCookiePolicy();

	res.clearCookie(REFRESH_COOKIE_NAME, refreshOptions);
};

/**
 * Convierte los tokens internos a formato público (sin refresh token en texto plano).
 *
 * @param tokens - Tokens completos del servicio de autenticación
 * @returns Tokens formateados para el cliente
 */
const toPublicAuthTokens = (tokens: {
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresIn: string;
	refreshTokenExpiresIn: string;
}): PublicAuthTokens => ({
	accessToken: tokens.accessToken,
	accessTokenExpiresIn: tokens.accessTokenExpiresIn,
	refreshTokenExpiresIn: tokens.refreshTokenExpiresIn,
});

/**
 * Controlador de autenticación del sistema.
 * Expone los endpoints públicos para login, logout, refresh de tokens,
 * recuperación y restablecimiento de contraseñas.
 *
 * Este controlador NO requiere autenticación JWT (endpoints públicos).
 * Utiliza cookies HttpOnly para el refresh token con políticas de seguridad.
 *
 * @Controller('auth') - Prefijo de ruta: /auth
 */
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	/**
	 * Endpoint para solicitar la recuperación de contraseña.
	 * Envía un token de un solo uso al correo electrónico del usuario.
	 *
	 * Propósito de seguridad:
	 * - No revela si el correo existe o no en el sistema (previene enumeración)
	 * - El token de recuperación tiene tiempo de expiración limitado
	 *
	 * @Roles() - Acceso público (sin autenticación requerida)
	 * @param recoverPasswordDto - DTO con el campo email
	 * @returns Mensaje genérico indicando que se envió el correo si existe la cuenta
	 * @throws BadRequestException - Si el email no es válido
	 */
	@Post('recover')
		await this.authService.requestPasswordRecovery(recoverPasswordDto.email);
		return {
			success: true,
			message:
				'Si la cuenta existe, recibirás un correo con instrucciones para restablecer la contraseña.',
		};
	}

	/**
	 * Endpoint para restablecer la contraseña con un token de un solo uso.
	 * Consume el token y actualiza la contraseña en la base de datos.
	 *
	 * Propósito de seguridad:
	 * - El token se invalida después de un uso exitoso
	 * - La nueva contraseña se hashea con Argon2 antes de almacenarse
	 *
	 * @Roles() - Acceso público (sin autenticación requerida)
	 * @param resetPasswordDto - DTO con token y nueva contraseña
	 * @returns Mensaje de éxito
	 * @throws NotFoundException - Si el token no existe o ha expirado
	 * @throws BadRequestException - Si la contraseña no cumple los requisitos de seguridad
	 */
	@Post('reset')
		await this.authService.resetPasswordWithOneTimeToken(
			resetPasswordDto.token,
			resetPasswordDto.password,
		);

		return {
			success: true,
			message: 'Contraseña actualizada correctamente.',
		};
	}

	/**
	 * Endpoint para validar un token de restablecimiento de contraseña.
	 * Verifica que el token sea válido y no haya expirado.
	 *
	 * @Roles() - Acceso público (sin autenticación requerida)
	 * @param validateResetTokenDto - DTO con el token a validar
	 * @returns Objeto con propiedad valid indicando si el token es válido
	 */
	@Post('reset/validate')
		return this.authService.validatePasswordResetToken(validateResetTokenDto.token);
	}

	/**
	 * Endpoint para iniciar sesión.
	 * Valida las credenciales y retorna los tokens JWT.
	 *
	 * Propósito de seguridad:
	 * - Utiliza Argon2 para verificar la contraseña
	 * - Almacena el refresh token en una cookie HttpOnly
	 * - No retorna el refresh token en el cuerpo de la respuesta (solo en cookie)
	 *
	 * @Roles() - Acceso público (sin autenticación requerida)
	 * @param loginDto - DTO con email y password
	 * @param res - Objeto de respuesta Express para establecer la cookie
	 * @returns Tokens de autenticación (accessToken y tiempos de expiración)
	 * @throws UnauthorizedException - Si las credenciales son inválidas
	 */
	@Post('login')
		const user = await this.authService.validateUser(loginDto.email, loginDto.password);
		const tokens = await this.authService.login(user);

		if (res) {
			setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresIn);
		}

		return toPublicAuthTokens(tokens);
	}

	/**
	 * Endpoint para renovar los tokens JWT mediante un refresh token.
	 * Utiliza el refresh token de la cookie o del cuerpo de la solicitud.
	 *
	 * Propósito de seguridad:
	 * - Valida el refresh token hasheado en la base de datos
	 * - Rota el refresh token tras cada renovación
	 * - Previene el uso de tokens robados mediante validación de hash
	 *
	 * @Roles() - Acceso público (sin autenticación requerida)
	 * @param refreshTokenDto - DTO opcional con userId y refreshToken
	 * @param req - Objeto de solicitud para leer cookies
	 * @param res - Objeto de respuesta para actualizar la cookie
	 * @returns Nuevos tokens de autenticación
	 * @throws UnauthorizedException - Si el refresh token es inválido
	 */
	@Post('refresh')
		@Body() refreshTokenDto: Partial<RefreshTokenDto>,
		@Req() req: Request = { headers: {} } as Request,
		@Res({ passthrough: true }) res?: Response,
	) {
		const cookies = parseCookies(req);
		const refreshToken = refreshTokenDto.refreshToken ?? cookies[REFRESH_COOKIE_NAME];
		if (!refreshToken) {
			throw new UnauthorizedException('Refresh token no proporcionado');
		}

		const userId =
			refreshTokenDto.userId ??
			(await this.authService.resolveUserIdFromRefreshToken(refreshToken));

		const tokens = await this.authService.refreshTokens(
			userId,
			refreshToken,
		);

		if (res) {
			setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresIn);
		}

		return toPublicAuthTokens(tokens);
	}

	/**
	 * Endpoint para cerrar la sesión del usuario.
	 * Invalida el refresh token y limpia las cookies de sesión.
	 *
	 * Propósito de seguridad:
	 * - Añade el userId a la blacklist de Redis
	 * - Limpia todas las cookies de sesión del cliente
	 * - Previene la reutilización de tokens después del logout
	 *
	 * @Roles() - Acceso público (sin autenticación requerida)
	 * @param logoutDto - DTO opcional con userId
	 * @param req - Objeto de solicitud para leer cookies
	 * @param res - Objeto de respuesta para limpiar cookies
	 * @returns Objeto con success
	 * @throws UnauthorizedException - Si no se puede resolver la sesión a cerrar
	 */
	@Post('logout')
		@Body() logoutDto: Partial<LogoutDto>,
		@Req() req: Request = { headers: {} } as Request,
		@Res({ passthrough: true }) res?: Response,
	) {
		const cookies = parseCookies(req);
		const refreshToken = cookies[REFRESH_COOKIE_NAME];
		const userId =
			logoutDto.userId ??
			(refreshToken ? await this.authService.resolveUserIdFromRefreshToken(refreshToken) : undefined);
		if (!userId) {
			throw new UnauthorizedException('No se pudo resolver la sesión a cerrar');
		}

		if (res) {
			clearSessionCookies(res);
		}

		return this.authService.logout(userId);
	}
}
