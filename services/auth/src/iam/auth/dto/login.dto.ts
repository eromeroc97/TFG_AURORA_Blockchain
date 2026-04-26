import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para el endpoint de inicio de sesión (login).
 * Valida las credenciales del usuario.
 */
export class LoginDto {
	/** Dirección de correo electrónico válida */
	@IsEmail()
	email!: string;

	/** Contraseña del usuario (mínimo 1 carácter) */
	@IsString()
	@IsNotEmpty()
	password!: string;
}
