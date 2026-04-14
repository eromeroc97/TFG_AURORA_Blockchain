import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

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

}
