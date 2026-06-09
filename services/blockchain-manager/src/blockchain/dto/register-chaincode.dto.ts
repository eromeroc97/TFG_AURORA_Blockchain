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
  @IsOptional()
  ffiJson?: string;

  @IsString()
  @IsNotEmpty()
  eventName: string;

  @IsString()
  @IsNotEmpty()
  topic: string;
}