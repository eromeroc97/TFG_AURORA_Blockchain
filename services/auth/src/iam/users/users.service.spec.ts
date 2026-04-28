import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MailService } from '../../shared/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';
import { FireflyService } from '../../blockchain/firefly.service';
import { CryptoService } from '../../crypto/crypto.service';
import { RedisService } from '../redis/redis.service';

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
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should create user with PENDING status', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'id', email: 'test@local', status: UserStatus.PENDING });

    const result = await service.create({ email: 'test@local' });
    expect(result.status).toBe(UserStatus.PENDING);
  });

  it('should throw ConflictException when email exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ email: 'test@local' });
    await expect(service.create({ email: 'test@local' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('findAll should require privileged role', () => {
    expect(() => service.findAll(undefined, 'actor-id')).toThrow(ForbiddenException);
  });

  it('findAll should filter out global admins for ADMIN role', async () => {
    const expectedUsers = [
      {
        id: 'user-1',
        email: 'test@local',
        role: Role.USER,
        status: UserStatus.ACTIVE,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    prismaMock.user.findMany.mockResolvedValue(expectedUsers);

    const result = await service.findAll(Role.ADMIN, 'actor-id');

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        status: { not: UserStatus.REVOKED },
        id: { not: 'actor-id' },
        role: { not: Role.GLOBAL_ADMIN },
      },
      orderBy: { createdAt: 'desc' },
      select: service['userSelect'],
    });
    expect(result).toBe(expectedUsers);
  });

  it('findOne should throw NotFoundException when user is missing', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing-id', Role.ADMIN, 'actor-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateRefreshTokenHash should throw NotFoundException on P2025', async () => {
    const p2025Error = new Error('Not found') as Prisma.PrismaClientKnownRequestError;
    Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
    (p2025Error as any).code = 'P2025';
    prismaMock.user.update.mockRejectedValue(p2025Error);

    await expect(service.updateRefreshTokenHash('missing-id', null)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update should hash password when provided and return sanitized user', async () => {
    const updatedUser = {
      id: 'id',
      email: 'test@local',
      role: Role.USER,
      status: UserStatus.ACTIVE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaMock.user.update.mockResolvedValue(updatedUser);

    const result = await service.update('id', { password: 'NewPassword!1' });

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'id' },
        data: expect.objectContaining({
          passwordHash: expect.any(String),
          status: UserStatus.ACTIVE,
          isActive: true,
        }),
        select: service['userSelect'],
      }),
    );
    expect(result).toEqual(updatedUser);
  });

  it('remove should forbid admins from revoking their own account', async () => {
    await expect(service.remove('id', 'id', Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('changeRole should forbid changing own role', async () => {
    await expect(service.changeRole('target-id', Role.USER, 'target-id', Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should throw NotFoundException when findByEmail cannot locate user', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    await expect(service.findByEmail('missing@example.com')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should throw NotFoundException when findAuthUserById cannot locate user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(service.findAuthUserById('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should return false when validatePasswordResetToken throws BadRequestException', async () => {
    const resolveMock = jest.fn(() => Promise.reject(new BadRequestException('invalid token')));
    service['resolveValidPasswordResetToken'] = resolveMock as any;

    await expect(service.validatePasswordResetToken('invalid')).resolves.toEqual({ valid: false });
  });

  it('createPasswordResetToken should silently return when user is not found', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    await expect(service.createPasswordResetToken('missing@example.com')).resolves.toBeUndefined();
    expect(mailMock.sendRecoverEmail).not.toHaveBeenCalled();
  });

  it('approveUser should require actor id', async () => {
    await expect(service.approveUser('id', undefined, Role.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('approveUser should succeed and create identity for pending user', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: 'target-id', email: 'user@example.com', status: UserStatus.PENDING, role: Role.USER })
      .mockResolvedValueOnce({ identity: { publicKey: 'pub-key' } })
      .mockResolvedValueOnce({ identity: { privateKeyCiphertext: 'cipher', privateKeyIv: 'iv', privateKeyAuthTag: 'tag' } });
    cryptoMock.generateKeyPair.mockReturnValue({ publicKey: 'pub', privateKey: 'priv' });
    cryptoMock.encryptPrivateKey.mockReturnValue({ ciphertext: 'cipher', iv: 'iv', authTag: 'tag' });
    cryptoMock.decryptPrivateKey.mockReturnValue('private-key');
    cryptoMock.hashSha256.mockReturnValue('hash');
    cryptoMock.sign.mockReturnValue('signature');
    prismaMock.identity.create.mockResolvedValue({ id: 'identity-id' });
    prismaMock.user.update.mockResolvedValue({ id: 'target-id', status: UserStatus.ACTIVE, isActive: true, email: 'user@example.com' });
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);
    prismaMock.$transaction.mockResolvedValue([]);

    const result = await service.approveUser('target-id', 'actor-id', Role.ADMIN);

    expect(prismaMock.identity.create).toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'target-id' },
      data: expect.objectContaining({ identityId: 'identity-id', status: UserStatus.ACTIVE, isActive: true }),
      select: service['userSelect'],
    }));
    expect(mailMock.sendVerifyEmail).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ id: 'target-id' }));
  });

  it('changeRole should throw ConflictException when target is revoked', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'target-id', email: 'target@example.com', role: Role.USER, status: UserStatus.REVOKED });
    await expect(service.changeRole('target-id', Role.ADMIN, 'actor-id', Role.ADMIN)).rejects.toBeInstanceOf(ConflictException);
  });

  it('changeRole should succeed for valid update and send role changed email', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: 'target-id', email: 'target@example.com', role: Role.USER, status: UserStatus.ACTIVE })
      .mockResolvedValueOnce({ identity: { publicKey: 'pub-key' } })
      .mockResolvedValueOnce({ identity: { privateKeyCiphertext: 'cipher', privateKeyIv: 'iv', privateKeyAuthTag: 'tag' } });
    prismaMock.user.update.mockResolvedValue({ id: 'target-id', role: Role.ADMIN, email: 'target@example.com' });
    cryptoMock.hashSha256.mockReturnValue('hash');
    cryptoMock.sign.mockReturnValue('signature');
    cryptoMock.decryptPrivateKey.mockReturnValue('private-key');

    const result = await service.changeRole('target-id', Role.ADMIN, 'actor-id', Role.GLOBAL_ADMIN);

    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'target-id' },
      data: { role: Role.ADMIN },
      select: service['userSelect'],
    }));
    expect(mailMock.sendRoleChangedEmail).toHaveBeenCalledWith('target@example.com', Role.ADMIN, Role.USER);
    expect(result).toEqual(expect.objectContaining({ role: Role.ADMIN }));
  });
});