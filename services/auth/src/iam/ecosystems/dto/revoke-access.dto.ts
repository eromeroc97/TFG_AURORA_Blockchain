import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class RevokeAccessDto {
	@ApiProperty({
		description: 'ID del usuario cuyo acceso se desea revocar.',
		example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
		type: 'string',
		format: 'uuid',
	})
	@IsUUID()
	userId!: string;
}