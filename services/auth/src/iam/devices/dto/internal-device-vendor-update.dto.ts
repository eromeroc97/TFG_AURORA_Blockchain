import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class InternalDeviceVendorUpdateDto {
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

  @ApiProperty({
    description: 'Proveedor o vendor del dispositivo.',
    example: 'Cisco',
  })
  @IsString()
  @IsNotEmpty()
  vendor!: string;
}
