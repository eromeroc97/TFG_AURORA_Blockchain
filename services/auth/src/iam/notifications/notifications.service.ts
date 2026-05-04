import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationCategory,
  NotificationType,
  NotificationStatus,
  Notification,
  AccessRole,
  Prisma,
} from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const metadata = createNotificationDto.metadata as Prisma.InputJsonValue | undefined;
    return this.prisma.notification.create({
      data: {
        category: createNotificationDto.category,
        type: createNotificationDto.type,
        targetType: createNotificationDto.targetType ?? 'INDIVIDUAL',
        actorType: createNotificationDto.actorType ?? 'USER',
        actorId: createNotificationDto.actorId,
        actorEmail: createNotificationDto.actorEmail,
        userId: createNotificationDto.userId,
        referenceId: createNotificationDto.referenceId,
        referenceType: createNotificationDto.referenceType,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        actionUrl: createNotificationDto.actionUrl,
        metadata,
        status: NotificationStatus.PENDING,
      },
    });
  }

  async findAllForUser(userId: string, includeRead: boolean = false): Promise<Notification[]> {
    const whereClause: Record<string, unknown> = {
      userId,
      targetType: 'INDIVIDUAL',
    };

    if (!includeRead) {
      whereClause.status = NotificationStatus.PENDING;
    }

    return this.prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllGlobal(): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        targetType: 'GLOBAL',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.findOne(id);

    if (notification.userId && notification.userId !== userId) {
      throw new BadRequestException('No tienes permisos para modificar esta notificación');
    }

    if (notification.category !== NotificationCategory.READ_ONLY) {
      throw new BadRequestException('Esta notificación requiere una acción, no solo lectura');
    }

    if (notification.status === NotificationStatus.READ) {
      return notification;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async respondToNotification(
    id: string,
    userId: string,
    response: 'ACCEPTED' | 'REJECTED',
  ): Promise<Notification> {
    const notification = await this.findOne(id);

    if (notification.userId && notification.userId !== userId) {
      throw new BadRequestException('No tienes permisos para modificar esta notificación');
    }

    if (notification.category !== NotificationCategory.ACTION_EXPECTED) {
      throw new BadRequestException('Esta notificación no requiere una respuesta');
    }

    if (notification.status !== NotificationStatus.PENDING) {
      throw new BadRequestException('Esta notificación ya ha sido respondida');
    }

    const updatedNotification = await this.prisma.notification.update({
      where: { id },
      data: {
        status: response,
        respondedAt: new Date(),
      },
    });

    if (response === 'ACCEPTED' && notification.type === NotificationType.ECOSYSTEM_DELEGATION_REQUEST) {
      const metadata = notification.metadata as { ecosystemId: string; targetUserId: string; role: AccessRole } | null;
      if (metadata?.ecosystemId && metadata?.targetUserId) {
        await this.prisma.ecosystemAccess.create({
          data: {
            ecosystemId: metadata.ecosystemId,
            userId: metadata.targetUserId,
            role: metadata.role ?? AccessRole.VIEWER,
          },
        });
      }
    }

    return updatedNotification;
  }

  async getPendingCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.PENDING,
      },
    });
  }

  async sendToUser(
    userId: string,
    title: string,
    message: string,
    actorId: string,
    actorEmail: string,
  ): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        category: NotificationCategory.READ_ONLY,
        type: NotificationType.ADMINISTRATOR_NOTIFICATION,
        targetType: 'INDIVIDUAL',
        actorType: 'USER',
        actorId,
        actorEmail,
        userId,
        title,
        message,
        status: NotificationStatus.PENDING,
      },
    });
  }

  async sendToRoles(
    roles: string[],
    title: string,
    message: string,
    actorId: string,
    actorEmail: string,
  ): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: roles as any[] },
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    const notifications = users.map((user) => ({
      category: NotificationCategory.READ_ONLY,
      type: NotificationType.ADMINISTRATOR_NOTIFICATION,
      targetType: 'INDIVIDUAL' as const,
      actorType: 'USER' as const,
      actorId,
      actorEmail,
      userId: user.id,
      title,
      message,
      status: NotificationStatus.PENDING,
    }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({
        data: notifications,
      });
    }

    return notifications.length;
  }
}