import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class SignHashDto {
  @IsUUID()
  @IsNotEmpty()
  ecosystemId!: string;

  @IsString()
  @IsNotEmpty()
  hash!: string;
}