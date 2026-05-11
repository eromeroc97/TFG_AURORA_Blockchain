import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

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

  @IsString()
  @IsOptional()
  eventName?: string;

  @IsString()
  @IsOptional()
  topic?: string;
}