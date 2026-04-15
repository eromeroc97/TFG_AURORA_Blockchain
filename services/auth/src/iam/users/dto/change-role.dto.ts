import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangeRoleDto {
  @ApiProperty({
    description: 'Nuevo rol del usuario.',
    enum: Role,
    example: Role.ADMIN,
  })
  @IsEnum(Role)
  newRole!: Role;
}