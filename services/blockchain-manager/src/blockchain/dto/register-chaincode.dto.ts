import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterChaincodeDto {
  @IsString()
  @IsNotEmpty()
  apiName: string;

  @IsString()
  @IsNotEmpty()
  channel: string;

  @IsString()
  @IsNotEmpty()
  chaincodeName: string;

  @IsString()
  @IsNotEmpty()
  ffiJson: string;
}