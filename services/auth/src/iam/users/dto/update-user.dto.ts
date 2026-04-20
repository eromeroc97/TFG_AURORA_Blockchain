import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { Role, UserStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsStrongPassword } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
	@ApiPropertyOptional({
		description: 'Nueva contraseña del usuario. Se hashea antes de guardarse.',
		example: 'NewStrongPass123!',
	})
	@IsOptional()
	@IsString()
	@IsStrongPassword({
		minLength: 10,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	password?: string;

	@ApiPropertyOptional({
		description: 'Rol del usuario en el sistema IAM.',
		example: Role.USER,
	})
	@IsOptional()
	@IsEnum(Role)
	role?: Role;

	@ApiPropertyOptional({
		description: 'Estado del usuario.',
		example: UserStatus.ACTIVE,
	})
	@IsOptional()
	@IsEnum(UserStatus)
	status?: UserStatus;

	@ApiPropertyOptional({
		description: 'Indicador de activacion del usuario.',
		example: true,
	})
	@IsOptional()
	@IsBoolean()
	@Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
	isActive?: boolean;
}
