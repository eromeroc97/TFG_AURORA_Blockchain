import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { DeviceCategory } from '@prisma/client';

export class CreateDeviceDto {
  @ApiProperty({
    description: 'Nombre legible del dispositivo.',
    example: 'sensor-humedad-01',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'UUID del ecosistema propietario del dispositivo.',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID('4')
  ecosystemId!: string;

  @ApiPropertyOptional({
    description: 'Categoría del dispositivo.',
    enum: DeviceCategory,
    example: 'SMART_BULB',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Habitación o ubicación del dispositivo.',
    example: 'Salón',
  })
  @IsOptional()
  @IsString()
  room?: string;

  @ApiPropertyOptional({
    description: 'Dirección MAC del dispositivo.',
    example: 'AA:BB:CC:DD:EE:FF',
  })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiPropertyOptional({
    description: 'Proveedor o vendor del dispositivo.',
    example: 'Cisco',
  })
  @IsOptional()
  @IsString()
  vendor?: string;

}