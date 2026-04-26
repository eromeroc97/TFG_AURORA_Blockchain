import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO para restablecer la contraseña con token de un solo uso.
 * El token se envía por correo y tiene tiempo de expiración.
 */
export class ResetPasswordDto {
	/** Token de un solo uso enviado por correo electrónico */
	@IsString()
	@IsNotEmpty()
	token!: string;

	/** Nueva contraseña (mínimo 12 caracteres) */
	@IsString()
	@IsNotEmpty()
	@MinLength(12)
	password!: string;
}
