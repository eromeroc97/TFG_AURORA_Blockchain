import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	async login(@Body() loginDto: LoginDto) {
		const user = await this.authService.validateUser(loginDto.email, loginDto.password);
		return this.authService.login(user);
	}

	@Post('refresh')
	refresh(@Body() refreshTokenDto: RefreshTokenDto) {
		return this.authService.refreshTokens(refreshTokenDto.userId, refreshTokenDto.refreshToken);
	}

	@Post('logout')
	logout(@Body() logoutDto: LogoutDto) {
		return this.authService.logout(logoutDto.userId);
	}
}
