import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveUserDto {
  @ApiProperty({
    description: 'DID del administrador que aprueba el alta Zero-Trust.',
    example: 'did:firefly:custom/admin@aurora.local',
    required: false,
  })
  @IsOptional()
  @IsString()
  adminDid?: string;
}