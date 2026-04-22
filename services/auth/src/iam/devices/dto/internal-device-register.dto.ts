import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class InternalDeviceRegisterDto {
  @ApiProperty({
    description: 'UUID del ecosistema propietario del dispositivo.',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID('4')
  ecosystemId!: string;

  @ApiProperty({
    description: 'Dirección MAC del dispositivo.',
    example: 'AA:BB:CC:DD:EE:FF',
  })
  @IsString()
  @IsNotEmpty()
  macAddress!: string;

  @ApiPropertyOptional({
    description: 'Proveedor o vendor del dispositivo.',
    example: 'Cisco',
  })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({
    description: 'Nombre preferido para el dispositivo.',
    example: 'sensor-humedad-01',
  })
  @IsOptional()
  @IsString()
  preferredName?: string;
}
