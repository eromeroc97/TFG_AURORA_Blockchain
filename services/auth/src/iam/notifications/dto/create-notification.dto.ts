import { NotificationCategory, NotificationType, ActorType, TargetType, ReferenceType, NotificationStatus } from '@prisma/client';

export class CreateNotificationDto {
  category!: NotificationCategory;
  type!: NotificationType;
  targetType?: TargetType;
  actorType?: ActorType;
  actorId?: string;
  actorEmail?: string;
  userId?: string;
  referenceId?: string;
  referenceType?: ReferenceType;
  title!: string;
  message!: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export class UpdateNotificationStatusDto {
  status!: 'READ' | 'ACCEPTED' | 'REJECTED';
}

export class SendToUserDto {
  userId!: string;
  title!: string;
  message!: string;
}

export class SendToRolesDto {
  roles!: string[];
  title!: string;
  message!: string;
}