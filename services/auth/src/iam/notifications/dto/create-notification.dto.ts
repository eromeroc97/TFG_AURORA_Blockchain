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