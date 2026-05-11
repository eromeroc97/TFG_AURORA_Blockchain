import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { StringValue } from 'ms';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { ActionsAnchorService } from '../../blockchain/anchoring/actions-anchor.service';
import { ActionType } from '../../blockchain/anchoring/action-types.enum';
import { decodeRsaPublicKey } from './jwt-key.util';

/**
 * Payload del token JWT.
 */
interface AuthPayload {
  /** ID del usuario */
  sub: string;
  /** Email del usuario */
  email: string;
  /** Rol del usuario */
  role: string;
}

/**
 * Decodifica la clave pública desde variable de entorno.
 *
 * @param rawValue - Valor de la variable de entorno
 * @returns Clave pública en formato PEM
 * @throws Error si no está configurada
 */

/**
 * Servicio de autenticación.
 * Maneja login, registro, recuperación de contraseña y JWT.
 *
 * Propósito de seguridad:
 * - Valida credenciales con Argon2
 * - Genera tokens JWT RS256
 * - Gestiona sesiones en Redis
 *
 * @Roles ADMIN, USER
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly anchoringService: ActionsAnchorService,
  ) {}

	async requestPasswordRecovery(email: string): Promise<void> {
		await this.usersService.createPasswordResetToken(email);
	}

	async resetPasswordWithOneTimeToken(token: string, password: string): Promise<void> {
		await this.usersService.consumePasswordResetToken(token, password);
	}

	async validatePasswordResetToken(token: string): Promise<{ valid: boolean }> {
		return this.usersService.validatePasswordResetToken(token);
	}

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

	async resolveUserIdFromRefreshToken(refreshToken: string): Promise<string> {
		try {
			const payload = await this.jwtService.verifyAsync<{ sub?: string; type?: string }>(
				refreshToken,
				{
					algorithms: ['RS256'],
					secret: decodeRsaPublicKey(process.env.JWT_PUBLIC_KEY, 'JWT_PUBLIC_KEY'),
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

	async updateRefreshToken(userId: string, refreshToken: string) {
		const hashedRefreshToken = await argon2.hash(refreshToken);
		await this.usersService.updateRefreshTokenHash(userId, hashedRefreshToken);
	}

	async login(user: { id: string; email: string; role: string }) {
		const tokens = await this.generateTokens(user);
		await this.updateRefreshToken(user.id, tokens.refreshToken);
		await this.anchoringService.anchorAction({
			actionType: ActionType.AUTH_LOGIN,
			actorId: user.id,
			targetId: user.id,
			readableDescription: `User ${user.email} logged in`,
		});
		return tokens;
	}

	async logout(userId: string) {
		await this.usersService.updateRefreshTokenHash(userId, null);
		await this.redisService.addToBlacklist(userId, 300);
		await this.anchoringService.anchorAction({
			actionType: ActionType.AUTH_LOGOUT,
			actorId: userId,
			targetId: userId,
			readableDescription: `User logged out`,
		});
		return { success: true };
	}
}