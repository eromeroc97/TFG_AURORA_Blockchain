import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const ACCESS_COOKIE_NAME = 'access_token';
const REFRESH_COOKIE_NAME = 'refreshToken';
const SESSION_USER_COOKIE_NAME = 'session_uid';

const parseExpiresToMs = (expiresIn: string | undefined, fallbackMs: number): number => {
	if (!expiresIn) {
		return fallbackMs;
	}

	const trimmed = expiresIn.trim();
	const directNumber = Number(trimmed);
	if (!Number.isNaN(directNumber)) {
		return directNumber;
	}

	const match = trimmed.match(/^(\d+)\s*([smhd])$/i);
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

const setSessionCookie = (res: Response, accessToken: string, expiresIn: string | undefined) => {
	res.cookie(ACCESS_COOKIE_NAME, accessToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: parseExpiresToMs(expiresIn, 30 * 60 * 1000),
	});
};

const setRefreshCookie = (res: Response, refreshToken: string, expiresIn: string | undefined) => {
	res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
		httpOnly: true,
		secure: true,
		sameSite: 'strict',
		path: '/',
		maxAge: parseExpiresToMs(expiresIn, 24 * 60 * 60 * 1000),
	});
};

const setSessionUserCookie = (res: Response, userId: string, expiresIn: string | undefined) => {
	res.cookie(SESSION_USER_COOKIE_NAME, userId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		maxAge: parseExpiresToMs(expiresIn, 24 * 60 * 60 * 1000),
	});
};

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

const clearSessionCookies = (res: Response) => {
	const accessAndUserOptions = {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		path: '/',
	};
	const refreshOptions = {
		httpOnly: true,
		secure: true,
		sameSite: 'strict' as const,
		path: '/',
	};

	res.clearCookie(ACCESS_COOKIE_NAME, accessAndUserOptions);
	res.clearCookie(REFRESH_COOKIE_NAME, refreshOptions);
	res.clearCookie(SESSION_USER_COOKIE_NAME, accessAndUserOptions);
};

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res?: Response) {
		const user = await this.authService.validateUser(loginDto.email, loginDto.password);
		const tokens = await this.authService.login(user);

		if (res) {
			setSessionCookie(res, tokens.accessToken, tokens.accessTokenExpiresIn);
			setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresIn);
			setSessionUserCookie(res, user.id, tokens.refreshTokenExpiresIn);
		}

		return tokens;
	}

	@Post('refresh')
	async refresh(
		@Body() refreshTokenDto: Partial<RefreshTokenDto>,
		@Req() req: Request = { headers: {} } as Request,
		@Res({ passthrough: true }) res?: Response,
	) {
		const cookies = parseCookies(req);
		const userId = refreshTokenDto.userId ?? cookies[SESSION_USER_COOKIE_NAME];
		const refreshToken = refreshTokenDto.refreshToken ?? cookies[REFRESH_COOKIE_NAME];

		if (!userId || !refreshToken) {
			throw new UnauthorizedException('Refresh token no proporcionado');
		}

		const tokens = await this.authService.refreshTokens(
			userId,
			refreshToken,
		);

		if (res) {
			setSessionCookie(res, tokens.accessToken, tokens.accessTokenExpiresIn);
			setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresIn);
			setSessionUserCookie(res, userId, tokens.refreshTokenExpiresIn);
		}

		return tokens;
	}

	@Post('logout')
	async logout(
		@Body() logoutDto: Partial<LogoutDto>,
		@Req() req: Request = { headers: {} } as Request,
		@Res({ passthrough: true }) res?: Response,
	) {
		const cookies = parseCookies(req);
		const userId = logoutDto.userId ?? cookies[SESSION_USER_COOKIE_NAME];
		if (!userId) {
			throw new UnauthorizedException('No se pudo resolver la sesión a cerrar');
		}

		if (res) {
			clearSessionCookies(res);
		}

		return this.authService.logout(userId);
	}
}
