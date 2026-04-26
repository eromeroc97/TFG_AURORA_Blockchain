import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para solicitar recuperación de contraseña.
 * Envía un token al correo electrónico del usuario.
 */
export class RecoverPasswordDto {
	/** Dirección de correo electrónico válida */
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	email!: string;
}
