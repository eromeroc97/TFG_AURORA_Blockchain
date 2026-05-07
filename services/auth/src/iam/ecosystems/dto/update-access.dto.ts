import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AccessRole } from '@prisma/client';

export class UpdateAccessDto {
	@ApiProperty({
		description: 'Nuevo rol de acceso para el usuario.',
		enum: AccessRole,
		enumName: 'AccessRole',
		example: 'EDITOR',
	})
	@IsEnum(AccessRole, { message: 'El rol debe ser VIEWER o EDITOR' })
	role!: AccessRole;
}