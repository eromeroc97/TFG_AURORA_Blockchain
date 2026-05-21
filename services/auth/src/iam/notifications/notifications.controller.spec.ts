import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const notificationsServiceMock = {
    findAllForUser: jest.fn() as any,
    findAllGlobal: jest.fn() as any,
    getPendingCount: jest.fn() as any,
    findOne: jest.fn() as any,
    markAsRead: jest.fn() as any,
    respondToNotification: jest.fn() as any,
    sendToUser: jest.fn() as any,
    sendToRoles: jest.fn() as any,
  };

  const userRequest = { user: { sub: 'user-1', role: 'USER' } as any };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: notificationsServiceMock },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  it('findAll routes to findAllForUser with includeRead false by default', async () => {
    (notificationsServiceMock.findAllForUser as any).mockResolvedValue([]);

    await controller.findAll(userRequest as any, undefined);

    expect(notificationsServiceMock.findAllForUser).toHaveBeenCalledWith('user-1', false);
  });

  it('findAll parses includeRead query param', async () => {
    (notificationsServiceMock.findAllForUser as any).mockResolvedValue([]);

    await controller.findAll(userRequest as any, 'true');

    expect(notificationsServiceMock.findAllForUser).toHaveBeenCalledWith('user-1', true);
  });

  it('findAllGlobal routes to service', async () => {
    (notificationsServiceMock.findAllGlobal as any).mockResolvedValue([]);

    await controller.findAllGlobal();

    expect(notificationsServiceMock.findAllGlobal).toHaveBeenCalled();
  });

  it('getPendingCount routes to service', async () => {
    (notificationsServiceMock.getPendingCount as any).mockResolvedValue(3);

    const result = await controller.getPendingCount(userRequest as any);

    expect(notificationsServiceMock.getPendingCount).toHaveBeenCalledWith('user-1');
    expect(result).toBe(3);
  });

  it('findOne routes to service', async () => {
    (notificationsServiceMock.findOne as any).mockResolvedValue({ id: 'notif-1' });

    const result = await controller.findOne('notif-1');

    expect(notificationsServiceMock.findOne).toHaveBeenCalledWith('notif-1');
    expect(result).toEqual({ id: 'notif-1' });
  });

  it('markAsRead routes to service', async () => {
    (notificationsServiceMock.markAsRead as any).mockResolvedValue({ id: 'notif-1' });

    await controller.markAsRead('notif-1', userRequest as any);

    expect(notificationsServiceMock.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
  });

  it('accept routes respondToNotification ACCEPTED', async () => {
    (notificationsServiceMock.respondToNotification as any).mockResolvedValue({ id: 'notif-1' });

    await controller.accept('notif-1', userRequest as any);

    expect(notificationsServiceMock.respondToNotification).toHaveBeenCalledWith('notif-1', 'user-1', 'ACCEPTED');
  });

  it('reject routes respondToNotification REJECTED', async () => {
    (notificationsServiceMock.respondToNotification as any).mockResolvedValue({ id: 'notif-1' });

    await controller.reject('notif-1', userRequest as any);

    expect(notificationsServiceMock.respondToNotification).toHaveBeenCalledWith('notif-1', 'user-1', 'REJECTED');
  });

  describe('sendToUser', () => {
    it('sends notification to user', async () => {
      (notificationsServiceMock.sendToUser as any).mockResolvedValue({ id: 'notif-1' });

      const result = await controller.sendToUser(
        { userId: 'target-1', title: 'Hello', message: 'Test' } as any,
        userRequest as any,
      );

      expect(notificationsServiceMock.sendToUser).toHaveBeenCalledWith('target-1', 'Hello', 'Test', 'user-1');
      expect(result).toEqual({ id: 'notif-1' });
    });

    it('throws when sending to self', () => {
      expect(() =>
        controller.sendToUser(
          { userId: 'user-1', title: 'Hello', message: 'Test' } as any,
          userRequest as any,
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('sendToRoles', () => {
    it('sends to filtered roles', async () => {
      (notificationsServiceMock.sendToRoles as any).mockResolvedValue(2);

      const result = await controller.sendToRoles(
        { roles: ['ADMIN', 'GLOBAL_ADMIN'], title: 'Alert', message: 'Test' } as any,
        userRequest as any,
      );

      expect(notificationsServiceMock.sendToRoles).toHaveBeenCalledWith(['ADMIN', 'GLOBAL_ADMIN'], 'Alert', 'Test', 'user-1');
      expect(result).toBe(2);
    });

    it('throws when all roles filtered out', () => {
      expect(() =>
        controller.sendToRoles(
          { roles: ['USER'], title: 'Alert', message: 'Test' } as any,
          userRequest as any,
        ),
      ).toThrow(BadRequestException);
    });

    it('sends to all roles when sender has no role', async () => {
      (notificationsServiceMock.sendToRoles as any).mockResolvedValue(1);

      const result = await controller.sendToRoles(
        { roles: ['ADMIN'], title: 'Alert', message: 'Test' } as any,
        { user: { sub: 'user-1' } } as any,
      );

      expect(notificationsServiceMock.sendToRoles).toHaveBeenCalledWith(['ADMIN'], 'Alert', 'Test', 'user-1');
      expect(result).toBe(1);
    });
  });
});
