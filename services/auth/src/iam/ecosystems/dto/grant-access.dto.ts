import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { AccessRole } from '@prisma/client';

export class GrantAccessDto {
	@ApiProperty({
		description: 'Email del usuario al que se desea delegar acceso.',
		example: 'juan@example.com',
	})
	@IsEmail()
	email!: string;

	@ApiPropertyOptional({
		description: 'Rol de acceso que se desea otorga al usuario.',
		enum: AccessRole,
		enumName: 'AccessRole',
		example: 'VIEWER',
		default: 'VIEWER',
	})
	@IsOptional()
	@IsEnum(AccessRole, { message: 'El rol debe ser VIEWER o EDITOR' })
	role?: AccessRole = AccessRole.VIEWER;
}