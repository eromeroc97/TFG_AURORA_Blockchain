import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEcosystemDto {
	@ApiProperty({
		description: 'Nombre legible del ecosistema (Gateway principal).',
		example: 'invernadero-sur',
	})
	@IsString()
	@IsNotEmpty()
	name!: string;

	@ApiPropertyOptional({
		description: 'Latitud del Gateway para geolocalizacion del ecosistema.',
		example: 36.7213,
		nullable: true,
	})
	@Type(() => Number)
	@IsOptional()
	@IsLatitude()
	latitude?: number;

	@ApiPropertyOptional({
		description: 'Longitud del Gateway para geolocalizacion del ecosistema.',
		example: -4.4214,
		nullable: true,
	})
	@Type(() => Number)
	@IsOptional()
	@IsLongitude()
	longitude?: number;

	@ApiProperty({
		description: 'Owner del ecosistema. Debe ser un usuario aprobado previamente.',
		example: '11111111-1111-1111-1111-111111111111',
		required: true,
	})
	@IsNotEmpty()
	@IsUUID('4')
	ownerId!: string;
}
