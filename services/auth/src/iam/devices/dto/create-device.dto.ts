import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({
    description: 'Nombre legible del dispositivo.',
    example: 'sensor-humedad-01',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Fingerprint o identificador unico del dispositivo.',
    example: 'AA:BB:CC:DD:EE:FF',
  })
  @IsString()
  @IsNotEmpty()
  fingerprint!: string;

  @ApiProperty({
    description: 'UUID del ecosistema propietario del dispositivo.',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID('4')
  ecosystemId!: string;

  @ApiPropertyOptional({    description: 'Dirección MAC del dispositivo.',
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

  @ApiPropertyOptional({    description: 'Estado del dispositivo.',
    example: DeviceStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;

  @ApiPropertyOptional({
    description: 'DID del dispositivo en blockchain.',
    example: 'did:aurora:device:abc123',
  })
  @IsOptional()
  @IsString()
  did?: string | null;
}