import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
	IsBoolean,
	IsEmail,
	IsNotEmpty,
	IsString,
} from 'class-validator';

export class CreateUserDto {
	@ApiProperty({
		description: 'Correo electronico unico del usuario en el sistema IAM.',
		example: 'admin@aurora-iot.com',
	})
	@Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	email!: string;

	@ApiProperty({
		description: 'Indica si la cuenta esta habilitada para autenticacion.',
		required: false,
		example: true,
		default: true,
	})
	@Type(() => Boolean)
	@IsBoolean()
	isActive?: boolean;
}
