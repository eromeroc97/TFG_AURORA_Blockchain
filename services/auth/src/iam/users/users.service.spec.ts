import { BadRequestException, ConflictException, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MailService } from '../../shared/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';
import { FireflyService } from '../../blockchain/firefly.service';
import { CryptoService } from '../../crypto/crypto.service';
import { RedisService } from '../redis/redis.service';
import { ActionsAnchorService } from '../../blockchain/anchoring/actions-anchor.service';

jest.mock('axios');

describe('UsersService', () => {
  let service: UsersService;
  const prismaMock = {
    user: {
      findUnique: jest.fn() as any,
      create: jest.fn() as any,
      findMany: jest.fn() as any,
      findFirst: jest.fn() as any,
      update: jest.fn() as any,
    },
    passwordResetToken: {
      findUnique: jest.fn() as any,
      updateMany: jest.fn() as any,
      create: jest.fn() as any,
    },
    identity: { create: jest.fn() as any },
    ecosystem: { findMany: jest.fn() as any },
    $transaction: jest.fn() as any,
  };
  const mailMock = {
    sendWelcomeEmail: jest.fn() as any,
    sendVerifyEmail: jest.fn() as any,
    sendRecoverEmail: jest.fn() as any,
    sendAccountDeletedEmail: jest.fn() as any,
    sendRoleChangedEmail: jest.fn() as any,
  };
  const fireflyMock = { broadcastAnchor: jest.fn() as any };
  const cryptoMock = {
    generateKeyPair: jest.fn() as any,
    encryptPrivateKey: jest.fn() as any,
    decryptPrivateKey: jest.fn() as any,
    sign: jest.fn() as any,
    hashSha256: jest.fn() as any,
  };
  const redisMock = { get: jest.fn() as any, set: jest.fn() as any, addToBlacklist: jest.fn() as any };
  const anchoringMock = { anchorAction: jest.fn() as any };

  const userSelect = {
    id: true, email: true, role: true, status: true, isActive: true, createdAt: true, updatedAt: true,
  } as const;

  beforeEach(async () => {
    process.env.HIBP_PASSWORD_CHECK_ENABLED = 'false';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MailService, useValue: mailMock },
        { provide: FireflyService, useValue: fireflyMock },
        { provide: CryptoService, useValue: cryptoMock },
        { provide: RedisService, useValue: redisMock },
        { provide: ActionsAnchorService, useValue: anchoringMock },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('creates user with PENDING status', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 'id', email: 'test@local', status: UserStatus.PENDING });

      const result = await service.create({ email: 'test@local' });
      expect(result.status).toBe(UserStatus.PENDING);
    });

    it('throws ConflictException when email exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ email: 'test@local' });
      await expect(service.create({ email: 'test@local' })).rejects.toBeInstanceOf(ConflictException);
    });

    it('handles welcome email failure gracefully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 'id', email: 'test@local', status: UserStatus.PENDING });
      mailMock.sendWelcomeEmail.mockRejectedValue(new Error('SMTP down'));

      const result = await service.create({ email: 'test@local' });
      expect(result).toBeDefined();
    });

    it('throws InternalServerErrorException on unexpected db error', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockRejectedValue(new Error('connection timeout'));

      await expect(service.create({ email: 'test@local' })).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('requires privileged role', () => {
      expect(() => service.findAll(undefined, 'actor-id')).toThrow(ForbiddenException);
    });

    it('filters out global admins for ADMIN role', async () => {
      const expectedUsers = [{ id: 'user-1', email: 'test@local', role: Role.USER, status: UserStatus.ACTIVE, isActive: true, createdAt: new Date(), updatedAt: new Date() }];
      prismaMock.user.findMany.mockResolvedValue(expectedUsers);

      const result = await service.findAll(Role.ADMIN, 'actor-id');

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { status: { not: UserStatus.REVOKED }, id: { not: 'actor-id' }, role: { not: Role.GLOBAL_ADMIN } },
        orderBy: { createdAt: 'desc' },
        select: userSelect,
      });
      expect(result).toBe(expectedUsers);
    });

    it('shows all non-revoked users for GLOBAL_ADMIN', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.findAll(Role.GLOBAL_ADMIN);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { status: { not: UserStatus.REVOKED } },
        orderBy: { createdAt: 'desc' },
        select: userSelect,
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when user is missing', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing-id', Role.ADMIN, 'actor-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException for REVOKED user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'revoked-id', status: UserStatus.REVOKED });
      await expect(service.findOne('revoked-id', Role.ADMIN, 'actor-id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids ADMIN from viewing their own profile', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'same-id', status: UserStatus.ACTIVE, role: Role.ADMIN });
      await expect(service.findOne('same-id', Role.ADMIN, 'same-id')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids ADMIN from viewing GLOBAL_ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'ga-id', status: UserStatus.ACTIVE, role: Role.GLOBAL_ADMIN });
      await expect(service.findOne('ga-id', Role.ADMIN, 'actor-id')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('succeeds for valid user and actor', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-id', status: UserStatus.ACTIVE, role: Role.USER });

      const result = await service.findOne('user-id', Role.GLOBAL_ADMIN, 'actor-id');

      expect(result.id).toBe('user-id');
    });
  });

  describe('findByEmail', () => {
    it('throws NotFoundException when user not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      await expect(service.findByEmail('missing@example.com')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns user with auth selection when found', async () => {
      const user = { id: 'id', email: 'test@local', status: UserStatus.ACTIVE };
      prismaMock.user.findFirst.mockResolvedValue(user);

      const result = await service.findByEmail('test@local');

      expect(result).toEqual(user);
    });
  });

  describe('findMe', () => {
    it('returns user when found and active', async () => {
      const user = { id: 'id', email: 'test@local', status: UserStatus.ACTIVE };
      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await service.findMe('id');
      expect(result).toEqual(user);
    });

    it('throws NotFoundException when user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.findMe('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when user is REVOKED', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'revoked', status: UserStatus.REVOKED });
      await expect(service.findMe('revoked')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAuthUserById', () => {
    it('returns user when found', async () => {
      const user = { id: 'id', email: 'test@local' };
      prismaMock.user.findUnique.mockResolvedValue(user);

      const result = await service.findAuthUserById('id');
      expect(result).toEqual(user);
    });

    it('throws NotFoundException when not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.findAuthUserById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateRefreshTokenHash', () => {
    it('updates token hash successfully', async () => {
      prismaMock.user.update.mockResolvedValue({} as any);

      await service.updateRefreshTokenHash('id', 'hashed');
      expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: 'id' }, data: { hashedRefreshToken: 'hashed' } });
    });

    it('throws NotFoundException on P2025', async () => {
      const p2025Error = new Error('Not found') as Prisma.PrismaClientKnownRequestError;
      Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
      (p2025Error as any).code = 'P2025';
      prismaMock.user.update.mockRejectedValue(p2025Error);

      await expect(service.updateRefreshTokenHash('missing-id', null)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws InternalServerErrorException on unknown error', async () => {
      prismaMock.user.update.mockRejectedValue(new Error('db down'));
      await expect(service.updateRefreshTokenHash('id', null)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('update', () => {
    it('hashes password when provided and returns sanitized user', async () => {
      const updatedUser = { id: 'id', email: 'test@local', role: Role.USER, status: UserStatus.ACTIVE, isActive: true, createdAt: new Date(), updatedAt: new Date() };
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('id', { password: 'NewPassword!1' });

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'id' },
          data: expect.objectContaining({ passwordHash: expect.any(String), status: UserStatus.ACTIVE, isActive: true }),
          select: userSelect,
        }),
      );
      expect(result).toEqual(updatedUser);
    });

    it('throws NotFoundException on P2025', async () => {
      const p2025Error = new Error('Not found') as Prisma.PrismaClientKnownRequestError;
      Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
      (p2025Error as any).code = 'P2025';
      prismaMock.user.update.mockRejectedValue(p2025Error);

      await expect(service.update('missing', { name: 'x' } as any)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws InternalServerErrorException on unknown error', async () => {
      prismaMock.user.update.mockRejectedValue(new Error('db down'));
      await expect(service.update('id', { name: 'x' } as any)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('forbids admins from revoking their own account', async () => {
      await expect(service.remove('id', 'id', Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids non-admin non-self removal', async () => {
      await expect(service.remove('other-id', 'self-id', Role.USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids ADMIN from revoking another ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'admin-id', role: Role.ADMIN, status: UserStatus.ACTIVE });

      await expect(service.remove('admin-id', 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('revokes own account as USER', async () => {
      const userData = { id: 'self-id', email: 'user@example.com', role: Role.USER, status: UserStatus.ACTIVE };
      prismaMock.user.findUnique.mockResolvedValue(userData);
      prismaMock.user.update.mockResolvedValue(userData);

      const result = await service.remove('self-id', 'self-id', Role.USER);

      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(redisMock.addToBlacklist).toBeDefined();
    });

    it('throws NotFoundException when target missing', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing', 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when already revoked', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'revoked-id', role: Role.USER, status: UserStatus.REVOKED });

      await expect(service.remove('revoked-id', 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(ConflictException);
    });

    it('completes full revoke flow as admin', async () => {
      const userData = { id: 'target-id', email: 'target@example.com', role: Role.USER, status: UserStatus.ACTIVE, identity: { publicKey: 'pk' } };
      const revokedData = { id: 'target-id', status: UserStatus.REVOKED, isActive: false };
      prismaMock.user.findUnique.mockResolvedValue(userData);
      prismaMock.user.update.mockResolvedValue(revokedData);

      const result = await service.remove('target-id', 'actor-id', Role.GLOBAL_ADMIN);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'target-id' },
          data: expect.objectContaining({ status: UserStatus.REVOKED, isActive: false }),
        }),
      );
      expect(redisMock.addToBlacklist).toHaveBeenCalledWith('target-id', 300);
      expect(anchoringMock.anchorAction).toHaveBeenCalled();
      expect(mailMock.sendAccountDeletedEmail).toHaveBeenCalled();
      expect(result).toEqual(revokedData);
    });

    it('throws InternalServerErrorException on non-Prisma error in remove', async () => {
      const userData = { id: 'target-id', email: 'target@example.com', role: Role.USER, status: UserStatus.ACTIVE, identity: { publicKey: 'pk' } };
      prismaMock.user.findUnique.mockResolvedValue(userData);
      prismaMock.user.update.mockRejectedValue(new Error('unexpected'));

      await expect(service.remove('target-id', 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('changeRole', () => {
    const targetUser = { id: 'target-id', email: 'target@example.com', role: Role.USER, status: UserStatus.ACTIVE };
    const updatedUser = { id: 'target-id', role: Role.ADMIN, email: 'target@example.com' };

    it('forbids changing own role', async () => {
      await expect(service.changeRole('target-id', Role.USER, 'target-id', Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('requires actorId', async () => {
      await expect(service.changeRole('target-id', Role.ADMIN, undefined, Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException when target missing', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.changeRole('missing', Role.USER, 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when target is revoked', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...targetUser, status: UserStatus.REVOKED });

      await expect(service.changeRole('target-id', Role.ADMIN, 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(ConflictException);
    });

    it('succeeds for valid update and sends role changed email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(targetUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.changeRole('target-id', Role.ADMIN, 'actor-id', Role.GLOBAL_ADMIN);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'target-id' }, data: { role: Role.ADMIN }, select: userSelect }),
      );
      expect(mailMock.sendRoleChangedEmail).toHaveBeenCalledWith('target@example.com', Role.ADMIN, Role.USER);
      expect(result).toEqual(updatedUser);
    });

    it('handles null anchor result gracefully', async () => {
      anchoringMock.anchorAction.mockResolvedValue(null);
      prismaMock.user.findUnique.mockResolvedValue(targetUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.changeRole('target-id', Role.ADMIN, 'actor-id', Role.GLOBAL_ADMIN);

      expect(result).toEqual(updatedUser);
    });

    it('succeeds even when role change email fails', async () => {
      mailMock.sendRoleChangedEmail.mockRejectedValue(new Error('SMTP down'));
      prismaMock.user.findUnique.mockResolvedValue(targetUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.changeRole('target-id', Role.ADMIN, 'actor-id', Role.GLOBAL_ADMIN);

      expect(result).toEqual(updatedUser);
    });

    it('throws InternalServerErrorException on general error', async () => {
      prismaMock.user.findUnique.mockResolvedValue(targetUser);
      prismaMock.user.update.mockRejectedValue(new Error('db down'));

      await expect(service.changeRole('target-id', Role.ADMIN, 'actor-id', Role.GLOBAL_ADMIN))
        .rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('forbids ADMIN from assigning GLOBAL_ADMIN role', async () => {
      prismaMock.user.findUnique.mockResolvedValue(targetUser);

      await expect(service.changeRole('target-id', Role.GLOBAL_ADMIN as Role, 'actor-id', Role.ADMIN))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids ADMIN from modifying ADMIN role', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...targetUser, role: Role.ADMIN });

      await expect(service.changeRole('target-id', Role.USER, 'actor-id', Role.ADMIN))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids ADMIN from assigning ADMIN role', async () => {
      prismaMock.user.findUnique.mockResolvedValue(targetUser);

      await expect(service.changeRole('target-id', Role.ADMIN, 'actor-id', Role.ADMIN))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('approveUser', () => {
    const pendingUser = { id: 'target-id', email: 'user@example.com', status: UserStatus.PENDING, role: Role.USER };

    it('requires actorId', async () => {
      await expect(service.approveUser('id', undefined, Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids self-approval', async () => {
      await expect(service.approveUser('same-id', 'same-id', Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException for missing user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.approveUser('missing', 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when not PENDING', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...pendingUser, status: UserStatus.ACTIVE });

      await expect(service.approveUser('target-id', 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(ConflictException);
    });

    it('forbids ADMIN from approving ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...pendingUser, role: Role.ADMIN });

      await expect(service.approveUser('target-id', 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('forbids ADMIN from approving GLOBAL_ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...pendingUser, role: Role.GLOBAL_ADMIN });

      await expect(service.approveUser('target-id', 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('succeeds and creates identity for pending user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(pendingUser);
      cryptoMock.generateKeyPair.mockReturnValue({ publicKey: 'pub', privateKey: 'priv' });
      cryptoMock.encryptPrivateKey.mockReturnValue({ ciphertext: 'cipher', iv: 'iv', authTag: 'tag' });
      prismaMock.identity.create.mockResolvedValue({ id: 'identity-id' });
      prismaMock.user.update.mockResolvedValue({ id: 'target-id', status: UserStatus.ACTIVE, isActive: true, email: 'user@example.com' });
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);
      prismaMock.$transaction.mockResolvedValue([]);

      const result = await service.approveUser('target-id', 'actor-id', Role.ADMIN);

      expect(prismaMock.identity.create).toHaveBeenCalled();
      expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'target-id' },
        data: expect.objectContaining({ identityId: 'identity-id', status: UserStatus.ACTIVE, isActive: true }),
        select: userSelect,
      }));
      expect(mailMock.sendVerifyEmail).toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ id: 'target-id' }));
    });
  });

  describe('validatePasswordResetToken', () => {
    it('returns { valid: true } for valid token', async () => {
      const resolveMock = jest.fn<any>().mockResolvedValue({ id: 'token-id', userId: 'user-id', tokenHash: 'hash', createdAt: new Date(), usedAt: null });
      (service as any).resolveValidPasswordResetToken = resolveMock;

      const result = await service.validatePasswordResetToken('valid-token');
      expect(result).toEqual({ valid: true });
    });

    it('returns { valid: false } when BadRequestException is thrown', async () => {
      const resolveMock = jest.fn(() => Promise.reject(new BadRequestException('invalid')));
      (service as any).resolveValidPasswordResetToken = resolveMock;

      const result = await service.validatePasswordResetToken('invalid');
      expect(result).toEqual({ valid: false });
    });

    it('re-throws non-BadRequestException', async () => {
      const resolveMock = jest.fn(() => Promise.reject(new Error('unexpected')));
      (service as any).resolveValidPasswordResetToken = resolveMock;

      await expect(service.validatePasswordResetToken('error')).rejects.toThrow('unexpected');
    });
  });

  describe('createPasswordResetToken', () => {
    it('silently returns when user not found', async () => {
      prismaMock.user.findFirst.mockResolvedValue(null);

      await expect(service.createPasswordResetToken('missing@example.com')).resolves.toBeUndefined();
      expect(mailMock.sendRecoverEmail).not.toHaveBeenCalled();
    });

    it('issues token and sends email when user found', async () => {
      prismaMock.user.findFirst.mockResolvedValue({ id: 'user-id', email: 'user@example.com' });
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);
      prismaMock.user.update.mockResolvedValue({} as any);

      await service.createPasswordResetToken('user@example.com');

      expect(mailMock.sendRecoverEmail).toHaveBeenCalled();
    });
  });

  describe('getUserTelemetryVolume', () => {
    const OLD_ENV = process.env;

    afterEach(() => {
      process.env = { ...OLD_ENV };
    });

    it('throws when IOT_MANAGER_URL is not configured', async () => {
      delete process.env.IOT_MANAGER_URL;

      await expect(service.getUserTelemetryVolume('user-id')).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('returns zero volume when user has no ecosystems', async () => {
      process.env.IOT_MANAGER_URL = 'http://iot:3000';
      prismaMock.ecosystem.findMany.mockResolvedValue([]);

      const result = await service.getUserTelemetryVolume('user-id');

      expect(result).toEqual({ volume: 0 });
    });
  });
});
