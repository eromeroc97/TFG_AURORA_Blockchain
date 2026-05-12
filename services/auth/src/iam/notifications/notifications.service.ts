import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../shared/mail/mail.service';
import { ActionsAnchorService } from '../../blockchain/anchoring/actions-anchor.service';
import { ActionType } from '../../blockchain/anchoring/action-types.enum';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly anchoringService: ActionsAnchorService,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const metadata = createNotificationDto.metadata as Prisma.InputJsonValue | undefined;
    const notification = await this.prisma.notification.create({
      data: {
        category: createNotificationDto.category,
        type: createNotificationDto.type,
        targetType: createNotificationDto.targetType ?? 'INDIVIDUAL',
        actorType: createNotificationDto.actorType ?? 'USER',
        actorId: createNotificationDto.actorId,
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

    if (createNotificationDto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: createNotificationDto.userId },
        select: { email: true },
      });

      if (user?.email) {
        await this.mailService.sendNewNotificationEmail(user.email, createNotificationDto.title);
      }
    }

    return notification;
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
    }).then(async (notification) => {
      await this.anchoringService.anchorAction({
          actionType: ActionType.NOTIFICATION_READ,
        actorId: userId,
        targetId: id,
        readableDescription: `Notification "${notification.title}" marked as read`,
        metadata: { notificationId: id },
      });
      return notification;
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

    if (notification.type === NotificationType.ECOSYSTEM_DELEGATION_REQUEST && notification.actorId) {
      const ecosystem = await this.prisma.ecosystem.findUnique({
        where: { id: notification.referenceId ?? '' },
        select: { name: true },
      });

      const responder = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      const responseTitle = response === 'ACCEPTED'
        ? 'Solicitud aceptada'
        : 'Solicitud rechazada'

      const responseMessage = response === 'ACCEPTED'
        ? `${responder?.email ?? 'Un usuario'} ha aceptado tu invitación para acceder a '${ecosystem?.name ?? 'un ecosistema'}'`
        : `${responder?.email ?? 'Un usuario'} ha rechazado tu invitación para acceder a '${ecosystem?.name ?? 'un ecosistema'}'`

await this.prisma.notification.create({
          data: {
            category: NotificationCategory.READ_ONLY,
            type: NotificationType.ECOSYSTEM_DELEGATION_RESPONSE,
            targetType: 'INDIVIDUAL',
            actorType: 'USER',
            actorId: userId,
            userId: notification.actorId,
            referenceId: notification.referenceId,
            referenceType: notification.referenceType,
            title: responseTitle,
            message: responseMessage,
            status: NotificationStatus.PENDING,
            metadata: {
              originalNotificationId: id,
              ecosystemId: notification.referenceId,
              ecosystemName: ecosystem?.name,
              responderId: userId,
              responderEmail: responder?.email,
              result: response,
            } as Prisma.InputJsonValue,
          },
        })

      const actorUser = notification.actorId 
        ? await this.prisma.user.findUnique({ where: { id: notification.actorId }, select: { email: true } })
        : null

      if (responder?.email && actorUser?.email) {
        await this.mailService.sendEcosystemDelegationResponseEmail(
          actorUser.email,
          ecosystem?.name ?? 'un ecosistema',
          responder.email,
          response === 'ACCEPTED' ? 'aceptada' : 'rechazada',
        )
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
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        category: NotificationCategory.READ_ONLY,
        type: NotificationType.ADMINISTRATOR_NOTIFICATION,
        targetType: 'INDIVIDUAL',
        actorType: 'USER',
        actorId,
        userId,
        title,
        message,
        status: NotificationStatus.PENDING,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (user?.email) {
      await this.mailService.sendNewNotificationEmail(user.email, title);
    }

    await this.anchoringService.anchorAction({
      actionType: ActionType.NOTIFICATION_SENT,
      actorId,
      targetId: userId,
      readableDescription: `Notification sent: "${title}" to user ${userId}`,
      metadata: { notificationId: notification.id, notificationType: 'ADMINISTRATOR_NOTIFICATION', recipientId: userId },
    });

    return notification;
  }

  async sendToRoles(
    roles: string[],
    title: string,
    message: string,
    actorId: string,
  ): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: roles as any[] },
        status: 'ACTIVE',
      },
      select: { id: true, email: true },
    });

    const notifications = users.map((user) => ({
      category: NotificationCategory.READ_ONLY,
      type: NotificationType.ADMINISTRATOR_NOTIFICATION,
      targetType: 'INDIVIDUAL' as const,
      actorType: 'USER' as const,
      actorId,
      userId: user.id,
      title,
      message,
      status: NotificationStatus.PENDING,
    }));

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({
        data: notifications,
      });

      for (const user of users) {
        if (user.email) {
          await this.mailService.sendNewNotificationEmail(user.email, title);
        }
      }

      await this.anchoringService.anchorAction({
        actionType: ActionType.NOTIFICATION_SENT,
        actorId,
        targetId: 'broadcast',
        readableDescription: `Global notification sent to ${roles.join(', ')}: "${title}" for ${notifications.length} users`,
        metadata: {
          title,
          roles: roles.join(','),
          userCount: String(notifications.length),
          notificationType: 'ADMINISTRATOR_NOTIFICATION',
        },
      });
    }

    return notifications.length;
  }
}