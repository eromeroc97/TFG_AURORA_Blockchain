import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RecoverPasswordDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
