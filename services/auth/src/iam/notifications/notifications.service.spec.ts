import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationCategory, NotificationStatus, NotificationType, AccessRole } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../shared/mail/mail.service';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const prismaMock: any = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      createMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    ecosystem: {
      findUnique: jest.fn(),
    },
    ecosystemAccess: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mailMock: any = {
    sendNewNotificationEmail: jest.fn(),
    sendEcosystemDelegationResponseEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MailService, useValue: mailMock },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification and send email if userId provided', async () => {
      const dto: CreateNotificationDto = {
        category: NotificationCategory.ACTION_EXPECTED,
        type: NotificationType.ECOSYSTEM_DELEGATION_REQUEST,
        actorId: 'actor-123',
        userId: 'user-456',
        referenceId: 'eco-789',
        referenceType: 'ECOSYSTEM',
        title: 'Test Notification',
        message: 'Test message',
      };

      const mockNotification = {
        id: 'notif-123',
        ...dto,
        status: NotificationStatus.PENDING,
      };

      prismaMock.notification.create.mockResolvedValue(mockNotification);
      prismaMock.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
      mailMock.sendNewNotificationEmail.mockResolvedValue(undefined);

      const result = await service.create(dto);

      expect(prismaMock.notification.create).toHaveBeenCalled();
      expect(mailMock.sendNewNotificationEmail).toHaveBeenCalledWith('user@example.com', dto.title);
      expect(result).toEqual(mockNotification);
    });

    it('should create notification without sending email if no userId', async () => {
      const dto: CreateNotificationDto = {
        category: NotificationCategory.READ_ONLY,
        type: NotificationType.ADMINISTRATOR_NOTIFICATION,
        actorId: 'actor-123',
        referenceId: 'eco-789',
        referenceType: 'ECOSYSTEM',
        title: 'System Notification',
        message: 'System message',
      };

      const mockNotification = { id: 'notif-123', ...dto };
      prismaMock.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create(dto);

      expect(prismaMock.notification.create).toHaveBeenCalled();
      expect(mailMock.sendNewNotificationEmail).not.toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('should not send email if user has no email', async () => {
      const dto: CreateNotificationDto = {
        category: NotificationCategory.READ_ONLY,
        type: NotificationType.ADMINISTRATOR_NOTIFICATION,
        actorId: 'actor-123',
        userId: 'user-456',
        referenceId: 'eco-789',
        referenceType: 'ECOSYSTEM',
        title: 'Test',
        message: 'Test',
      };

      prismaMock.notification.create.mockResolvedValue({ id: 'notif-123' });
      prismaMock.user.findUnique.mockResolvedValue({ email: null });

      await service.create(dto);

      expect(mailMock.sendNewNotificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('should return only pending notifications by default', async () => {
      const mockNotifications = [
        { id: 'notif-1', status: NotificationStatus.PENDING },
        { id: 'notif-2', status: NotificationStatus.PENDING },
      ];
      prismaMock.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.findAllForUser('user-123');

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          targetType: 'INDIVIDUAL',
          status: NotificationStatus.PENDING,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockNotifications);
    });

    it('should include read notifications when includeRead is true', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);

      await service.findAllForUser('user-123', true);

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          targetType: 'INDIVIDUAL',
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findAllGlobal', () => {
    it('should return global notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', targetType: 'GLOBAL' },
        { id: 'notif-2', targetType: 'GLOBAL' },
      ];
      prismaMock.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.findAllGlobal();

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { targetType: 'GLOBAL' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('findOne', () => {
    it('should return notification when found', async () => {
      const mockNotification = { id: 'notif-123', title: 'Test' };
      prismaMock.notification.findUnique.mockResolvedValue(mockNotification);

      const result = await service.findOne('notif-123');

      expect(prismaMock.notification.findUnique).toHaveBeenCalledWith({ where: { id: 'notif-123' } });
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException when not found', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await expect(service.findOne('notif-123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('should throw BadRequestException when userId does not match', async () => {
      const notification = { id: 'notif-123', userId: 'other-user', category: NotificationCategory.READ_ONLY };
      prismaMock.notification.findUnique.mockResolvedValue(notification);

      await expect(service.markAsRead('notif-123', 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for ACTION_EXPECTED category (use respondToNotification instead)', async () => {
      const notification = { id: 'notif-123', userId: 'user-123', category: NotificationCategory.ACTION_EXPECTED };
      prismaMock.notification.findUnique.mockResolvedValue(notification);

      await expect(service.markAsRead('notif-123', 'user-123')).rejects.toThrow(BadRequestException);
    });

    it('should return notification if already read for READ_ONLY', async () => {
      const notification = { id: 'notif-123', userId: 'user-123', category: NotificationCategory.READ_ONLY, status: NotificationStatus.READ };
      prismaMock.notification.findUnique.mockResolvedValue(notification);

      const result = await service.markAsRead('notif-123', 'user-123');

      expect(result).toEqual(notification);
      expect(prismaMock.notification.update).not.toHaveBeenCalled();
    });

    it('should update notification to READ status for READ_ONLY', async () => {
      const notification = { id: 'notif-123', userId: 'user-123', category: NotificationCategory.READ_ONLY, status: NotificationStatus.PENDING };
      const updatedNotification = { ...notification, status: NotificationStatus.READ, readAt: new Date() };
      prismaMock.notification.findUnique.mockResolvedValue(notification);
      prismaMock.notification.update.mockResolvedValue(updatedNotification);

      const result = await service.markAsRead('notif-123', 'user-123');

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: { status: NotificationStatus.READ, readAt: expect.any(Date) },
      });
      expect(result).toEqual(updatedNotification);
    });
  });

  describe('respondToNotification', () => {
    it('should throw BadRequestException when userId does not match', async () => {
      const notification = { id: 'notif-123', userId: 'other-user' };
      prismaMock.notification.findUnique.mockResolvedValue(notification);

      await expect(service.respondToNotification('notif-123', 'user-123', 'ACCEPTED')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-action category', async () => {
      const notification = { id: 'notif-123', userId: 'user-123', category: NotificationCategory.READ_ONLY };
      prismaMock.notification.findUnique.mockResolvedValue(notification);

      await expect(service.respondToNotification('notif-123', 'user-123', 'ACCEPTED')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already responded', async () => {
      const notification = { id: 'notif-123', userId: 'user-123', category: NotificationCategory.ACTION_EXPECTED, status: NotificationStatus.ACCEPTED };
      prismaMock.notification.findUnique.mockResolvedValue(notification);

      await expect(service.respondToNotification('notif-123', 'user-123', 'ACCEPTED')).rejects.toThrow(BadRequestException);
    });

    it('should update notification to ACCEPTED and activate ecosystem access', async () => {
      const notification = {
        id: 'notif-123',
        userId: 'user-456',
        category: NotificationCategory.ACTION_EXPECTED,
        type: NotificationType.ECOSYSTEM_DELEGATION_REQUEST,
        status: NotificationStatus.PENDING,
        actorId: 'actor-123',
        referenceId: 'eco-789',
        referenceType: 'ECOSYSTEM',
        metadata: { ecosystemId: 'eco-789', targetUserId: 'user-456', role: AccessRole.VIEWER },
      };
      const existingAccess = { id: 'access-1', status: 'PENDING' };
      const updatedNotification = { ...notification, status: NotificationStatus.ACCEPTED };
      prismaMock.notification.findUnique.mockResolvedValue(notification);
      prismaMock.notification.update.mockResolvedValue(updatedNotification);
      prismaMock.ecosystem.findUnique.mockResolvedValue({ name: 'Test Ecosystem' });
      prismaMock.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
      prismaMock.notification.create.mockResolvedValue({ id: 'response-notif' });
      prismaMock.ecosystemAccess.findUnique.mockResolvedValue(existingAccess);
      prismaMock.ecosystemAccess.update.mockResolvedValue({ ...existingAccess, status: 'VALID' });
      mailMock.sendEcosystemDelegationResponseEmail.mockResolvedValue(undefined);

      const result = await service.respondToNotification('notif-123', 'user-456', 'ACCEPTED');

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: { status: 'ACCEPTED', respondedAt: expect.any(Date) },
      });
      expect(prismaMock.ecosystemAccess.findUnique).toHaveBeenCalledWith({
        where: {
          ecosystemId_userId: { ecosystemId: 'eco-789', userId: 'user-456' },
        },
      });
      expect(prismaMock.ecosystemAccess.update).toHaveBeenCalledWith({
        where: { id: 'access-1' },
        data: { status: 'VALID', role: AccessRole.VIEWER },
      });
      expect(result).toEqual(updatedNotification);
    });

    it('should update notification to REJECTED', async () => {
      const notification = {
        id: 'notif-123',
        userId: 'user-456',
        category: NotificationCategory.ACTION_EXPECTED,
        type: NotificationType.ECOSYSTEM_DELEGATION_REQUEST,
        status: NotificationStatus.PENDING,
        actorId: 'actor-123',
        referenceId: 'eco-789',
        metadata: null,
      };
      const updatedNotification = { ...notification, status: NotificationStatus.REJECTED };
      prismaMock.notification.findUnique.mockResolvedValue(notification);
      prismaMock.notification.update.mockResolvedValue(updatedNotification);
      prismaMock.ecosystem.findUnique.mockResolvedValue({ name: 'Test Ecosystem' });
      prismaMock.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
      prismaMock.notification.create.mockResolvedValue({ id: 'response-notif' });

      const result = await service.respondToNotification('notif-123', 'user-456', 'REJECTED');

      expect(prismaMock.notification.update).toHaveBeenCalled();
      expect(result).toEqual(updatedNotification);
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending notifications', async () => {
      prismaMock.notification.count.mockResolvedValue(5);

      const result = await service.getPendingCount('user-123');

      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: NotificationStatus.PENDING },
      });
      expect(result).toBe(5);
    });
  });

  describe('sendToUser', () => {
    it('should create notification and send email', async () => {
      const mockNotification = { id: 'notif-123', title: 'Direct message' };
      prismaMock.notification.create.mockResolvedValue(mockNotification);
      prismaMock.user.findUnique.mockResolvedValue({ email: 'user@example.com' });
      mailMock.sendNewNotificationEmail.mockResolvedValue(undefined);

      const result = await service.sendToUser('user-123', 'Direct message', 'Hello!', 'actor-456');

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: NotificationCategory.READ_ONLY,
          type: NotificationType.ADMINISTRATOR_NOTIFICATION,
          userId: 'user-123',
          title: 'Direct message',
        }),
      });
      expect(mailMock.sendNewNotificationEmail).toHaveBeenCalledWith('user@example.com', 'Direct message');
      expect(result).toEqual(mockNotification);
    });
  });

  describe('sendToRoles', () => {
    it('should create notifications for all users with matching roles', async () => {
      const users = [
        { id: 'user-1', email: 'admin1@example.com' },
        { id: 'user-2', email: 'admin2@example.com' },
      ];
      prismaMock.user.findMany.mockResolvedValue(users);
      prismaMock.notification.createMany.mockResolvedValue({ count: 2 });
      mailMock.sendNewNotificationEmail.mockResolvedValue(undefined);

      const result = await service.sendToRoles(['ADMIN'], 'Admin alert', 'System maintenance', 'actor-123');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { role: { in: ['ADMIN'] }, status: 'ACTIVE' },
        select: { id: true, email: true },
      });
      expect(prismaMock.notification.createMany).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('should return 0 when no users match roles', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.sendToRoles(['ADMIN'], 'Alert', 'No admins', 'actor-123');

      expect(result).toBe(0);
      expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });
  });
});