import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';

interface AuthPayload {
	sub: string;
	email: string;
	role: string;
	did: string | null;
}

@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
		private readonly redisService: RedisService,
	) {}

	async validateUser(email: string, pass: string) {
		try {
			const user = await this.usersService.findByEmail(email);

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

	async generateTokens(user: { id: string; email: string; role: string; did: string | null }) {
		const payload: AuthPayload = {
			sub: user.id,
			email: user.email,
			role: user.role,
			did: user.did,
		};

		const accessToken = await this.jwtService.signAsync(payload, {
			algorithm: 'RS256',
		});

		const refreshToken = randomBytes(64).toString('base64url');

		return {
			accessToken,
			refreshToken,
			accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '30m',
			refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
		};
	}

	async updateRefreshToken(userId: string, refreshToken: string) {
		const hashedRefreshToken = await argon2.hash(refreshToken);
		await this.usersService.updateRefreshTokenHash(userId, hashedRefreshToken);
	}

	async login(user: { id: string; email: string; role: string; did: string | null }) {
		const tokens = await this.generateTokens(user);
		await this.updateRefreshToken(user.id, tokens.refreshToken);
		return tokens;
	}

	async refreshTokens(userId: string, refreshToken: string) {
		const user = await this.usersService.findAuthUserById(userId);

		if (
			user.status === UserStatus.PENDING ||
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

	async logout(userId: string) {
		await this.usersService.updateRefreshTokenHash(userId, null);
		await this.redisService.addToBlacklist(userId, 300);
		return { success: true };
	}
}
