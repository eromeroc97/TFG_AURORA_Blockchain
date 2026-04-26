import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * DTO para el endpoint de renovación de tokens (refresh).
 * Se puede proporcionar el userId o inferir desde el refresh token.
 */
export class RefreshTokenDto {
	/** ID único del usuario en formato UUID v4 */
	@IsUUID('4')
	userId!: string;

	/** Refresh token JWT */
	@IsString()
	@IsNotEmpty()
	refreshToken!: string;
}
