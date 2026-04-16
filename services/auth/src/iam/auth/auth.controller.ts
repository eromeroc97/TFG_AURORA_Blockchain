import { Body, Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const REFRESH_COOKIE_NAME = 'refreshToken';

type PublicAuthTokens = {
	accessToken: string;
	accessTokenExpiresIn: string;
	refreshTokenExpiresIn: string;
};

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

const parseBoolean = (rawValue: string | undefined, fallback: boolean): boolean => {
	if (!rawValue) {
		return fallback;
	}

	const normalized = rawValue.trim().toLowerCase();
	if (normalized === 'true') return true;
	if (normalized === 'false') return false;

	return fallback;
};

const parseSameSite = (rawValue: string | undefined): 'lax' | 'strict' | 'none' => {
	const normalized = rawValue?.trim().toLowerCase();
	if (normalized === 'strict' || normalized === 'none') {
		return normalized;
	}

	return 'lax';
};

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

const setRefreshCookie = (res: Response, refreshToken: string, expiresIn: string | undefined) => {
	const policy = getRefreshCookiePolicy();
	res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
		...policy,
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
 	const refreshOptions = getRefreshCookiePolicy();

	res.clearCookie(REFRESH_COOKIE_NAME, refreshOptions);
};

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

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res?: Response) {
		const user = await this.authService.validateUser(loginDto.email, loginDto.password);
		const tokens = await this.authService.login(user);

		if (res) {
			setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresIn);
		}

		return toPublicAuthTokens(tokens);
	}

	@Post('refresh')
	async refresh(
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

	@Post('logout')
	async logout(
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
