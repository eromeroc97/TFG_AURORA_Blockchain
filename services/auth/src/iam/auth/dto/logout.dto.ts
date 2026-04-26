import { IsUUID } from 'class-validator';

/**
 * DTO para el endpoint de cierre de sesión (logout).
 * Opcional: solo requiere userId si no hay cookie de sesión.
 */
export class LogoutDto {
	/** ID único del usuario en formato UUID v4 */
	@IsUUID('4')
	userId!: string;
}
