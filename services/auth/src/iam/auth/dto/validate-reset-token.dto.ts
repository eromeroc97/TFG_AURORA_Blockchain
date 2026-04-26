import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para validar un token de restablecimiento de contraseña.
 * Verifica que el token sea válido y no haya expirado.
 */
export class ValidateResetTokenDto {
	/** Token de un solo uso a validar */
	@IsString()
	@IsNotEmpty()
	token!: string;
}
