import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ApproveUserDto {
  @ApiProperty({
    description: 'DID del administrador que aprueba el alta Zero-Trust.',
    example: 'did:firefly:custom/admin@aurora.local',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  adminDid!: string;
}