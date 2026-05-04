import { IsString, IsNotEmpty, IsArray, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { NotificationCategory, NotificationType, ActorType, TargetType, ReferenceType, NotificationStatus } from '@prisma/client';

export class CreateNotificationDto {
  @IsEnum(NotificationCategory)
  category!: NotificationCategory;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsOptional()
  @IsEnum(TargetType)
  targetType?: TargetType;

  @IsOptional()
  @IsEnum(ActorType)
  actorType?: ActorType;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsEmail()
  actorEmail?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsEnum(ReferenceType)
  referenceType?: ReferenceType;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateNotificationStatusDto {
  @IsString()
  status!: 'READ' | 'ACCEPTED' | 'REJECTED';
}

export class SendToUserDto {
  @IsString()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class SendToRolesDto {
  @IsArray()
  @IsString({ each: true })
  roles!: string[];

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}