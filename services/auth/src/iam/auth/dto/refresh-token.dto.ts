import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @IsUUID('4')
  userId!: string;

  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
