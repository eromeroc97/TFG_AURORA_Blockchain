import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
	IsBoolean,
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsStrongPassword,
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
		description:
			'Contrasena en texto plano para alta inicial. Debe incluir mayuscula, minuscula, numero y caracter especial.',
		example: 'Aurora#2026Secure',
	})
	@IsString()
	@IsNotEmpty()
	@IsStrongPassword({
		minLength: 8,
		minUppercase: 1,
		minLowercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	password!: string;

	@ApiProperty({
		description: 'Rol del usuario. Si no se envia, Prisma asigna USER por defecto.',
		enum: Role,
		required: false,
		example: Role.USER,
	})
	@IsOptional()
	@IsEnum(Role)
	role?: Role;

	@ApiProperty({
		description:
			'Identificador descentralizado (DID) opcional para trazabilidad humana en la blockchain (Hyperledger FireFly).',
		required: false,
		example: 'did:firefly:org-aurora:user:admin-001',
		nullable: true,
	})
	@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
	@IsOptional()
	@IsString()
	did?: string;

	@ApiProperty({
		description: 'Indica si la cuenta esta habilitada para autenticacion.',
		required: false,
		example: true,
		default: true,
	})
	@Type(() => Boolean)
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
