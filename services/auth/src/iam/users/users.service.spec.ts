import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import axios from 'axios';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { randomBytes } from 'crypto';
import { FireflyService } from '../../blockchain/firefly.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../../shared/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('crypto', () => ({
  ...(jest.requireActual('crypto') as typeof import('crypto')),
  randomBytes: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prismaServiceMock: {
    user: {
      findUnique: ReturnType<typeof jest.fn>;
      findFirst: ReturnType<typeof jest.fn>;
      findMany: ReturnType<typeof jest.fn>;
      create: ReturnType<typeof jest.fn>;
      update: ReturnType<typeof jest.fn>;
      delete: ReturnType<typeof jest.fn>;
    };
    passwordResetToken: {
      findUnique: ReturnType<typeof jest.fn>;
      create: ReturnType<typeof jest.fn>;
      update: ReturnType<typeof jest.fn>;
      updateMany: ReturnType<typeof jest.fn>;
    };
    $transaction: ReturnType<typeof jest.fn>;
  };
  let mailServiceMock: {
    sendWelcomeEmail: ReturnType<typeof jest.fn>;
    sendVerifyEmail: ReturnType<typeof jest.fn>;
    sendRecoverEmail: ReturnType<typeof jest.fn>;
    sendRoleChangedEmail: ReturnType<typeof jest.fn>;
    sendAccountDeletedEmail: ReturnType<typeof jest.fn>;
  };
  let fireflyServiceMock: {
    createIdentity: ReturnType<typeof jest.fn>;
  };
  let redisServiceMock: {
    addToBlacklist: ReturnType<typeof jest.fn>;
    isBlacklisted: ReturnType<typeof jest.fn>;
  };

  const mockHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>;
  const mockVerify = argon2.verify as jest.MockedFunction<typeof argon2.verify>;
  const mockAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;
  const mockRandomBytes = randomBytes as jest.MockedFunction<typeof randomBytes>;
  const generatedPasswordBuffer = Buffer.from('temporary-password-123456');
  const generatedPassword = generatedPasswordBuffer.toString('base64url');

  const createUserDto: CreateUserDto = {
    email: 'admin@aurora.local',
  };

  const createdUserRecord = {
    id: 'a4a98bc5-a6a3-4e13-8cb7-4f2cbf3a4c75',
    email: createUserDto.email,
    passwordHash: 'hashed_password',
    role: Role.USER,
    status: UserStatus.PENDING,
    did: null,
    isActive: false,
    createdAt: new Date('2026-04-13T10:00:00.000Z'),
    updatedAt: new Date('2026-04-13T10:00:00.000Z'),
  };

  const selectedUserRecord = {
    id: createdUserRecord.id,
    email: createdUserRecord.email,
    role: createdUserRecord.role,
    status: createdUserRecord.status,
    isActive: createdUserRecord.isActive,
    did: createdUserRecord.did,
    createdAt: createdUserRecord.createdAt,
    updatedAt: createdUserRecord.updatedAt,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useFactory: () => ({
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            passwordResetToken: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            $transaction: jest.fn(),
          }),
        },
        {
          provide: MailService,
          useFactory: () => ({
            sendWelcomeEmail: jest.fn(),
            sendVerifyEmail: jest.fn(),
            sendRecoverEmail: jest.fn(),
            sendRoleChangedEmail: jest.fn(),
            sendAccountDeletedEmail: jest.fn(),
          }),
        },
        {
          provide: FireflyService,
          useFactory: () => ({
            createIdentity: jest.fn(),
          }),
        },
        {
          provide: RedisService,
          useFactory: () => ({
            addToBlacklist: jest.fn(),
            isBlacklisted: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaServiceMock = module.get(PrismaService) as unknown as typeof prismaServiceMock;
    mailServiceMock = module.get(MailService) as unknown as typeof mailServiceMock;
    fireflyServiceMock = module.get(FireflyService) as unknown as typeof fireflyServiceMock;
    redisServiceMock = module.get(RedisService) as unknown as typeof redisServiceMock;
    jest.clearAllMocks();
    prismaServiceMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof prismaServiceMock) => Promise<unknown>)(prismaServiceMock);
      }

      return Promise.all(arg as Array<Promise<unknown>>);
    });
    mockAxiosGet.mockResolvedValue({ data: '' } as never);
  });

  it('should hash password and create user', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue('hashed_password' as never);
    mockRandomBytes.mockReturnValue(generatedPasswordBuffer as never);
    prismaServiceMock.user.create.mockResolvedValue(createdUserRecord);
    mailServiceMock.sendWelcomeEmail.mockResolvedValue(undefined);

    const result = await service.create(createUserDto);

    expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: createUserDto.email },
    });
    expect(mockRandomBytes).toHaveBeenCalledWith(24);
    expect(mockHash).toHaveBeenCalledWith(generatedPassword);
    expect(prismaServiceMock.user.create).toHaveBeenCalledWith({
      data: {
        email: createUserDto.email,
        passwordHash: 'hashed_password',
        role: Role.USER,
        status: UserStatus.PENDING,
        did: null,
        isActive: false,
      },
    });
    expect(mailServiceMock.sendWelcomeEmail).toHaveBeenCalledWith(createUserDto.email);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).toMatchObject({
      id: createdUserRecord.id,
      email: createdUserRecord.email,
      role: createdUserRecord.role,
      status: createdUserRecord.status,
      did: createdUserRecord.did,
      isActive: createdUserRecord.isActive,
    });
  });

  it('should throw ConflictException', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(createdUserRecord);

    await expect(service.create(createUserDto)).rejects.toBeInstanceOf(ConflictException);

    expect(prismaServiceMock.user.create).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
    expect(mailServiceMock.sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException when database creation fails', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(null);
    mockRandomBytes.mockReturnValue(generatedPasswordBuffer as never);
    mockHash.mockResolvedValue('hashed_password' as never);
    prismaServiceMock.user.create.mockRejectedValue(new Error('database unavailable'));

    await expect(service.create(createUserDto)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  describe('findAll', () => {
    it('should return users without passwordHash', async () => {
      prismaServiceMock.user.findMany.mockResolvedValue([selectedUserRecord]);

      const result = await service.findAll();

      expect(prismaServiceMock.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          did: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual([selectedUserRecord]);
    });
  });

  describe('findOne', () => {
    it('should return one user without passwordHash', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(selectedUserRecord);

      const result = await service.findOne(createdUserRecord.id);

      expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: createdUserRecord.id },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          did: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(selectedUserRecord);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('should hash password and update user', async () => {
      mockHash.mockResolvedValue('new_hashed_password' as never);
      prismaServiceMock.user.update.mockResolvedValue({
        ...selectedUserRecord,
        email: 'updated@aurora.local',
      });

      const dto: UpdateUserDto = {
        email: 'updated@aurora.local',
        password: 'NewPassword123!',
      };

      const result = await service.update(createdUserRecord.id, dto);

      expect(mockHash).toHaveBeenCalledWith('NewPassword123!');
      expect(prismaServiceMock.user.update).toHaveBeenCalledWith({
        where: { id: createdUserRecord.id },
        data: expect.objectContaining({
          email: 'updated@aurora.local',
          passwordHash: 'new_hashed_password',
          status: UserStatus.ACTIVE,
          isActive: true,
          passwordChangedAt: expect.any(Date),
        }),
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          did: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual({
        ...selectedUserRecord,
        email: 'updated@aurora.local',
      });
    });

    it('should reactivate user account when password changes', async () => {
      mockHash.mockResolvedValue('reactivated_hashed_password' as never);
      prismaServiceMock.user.update.mockResolvedValue(selectedUserRecord);

      await service.update(createdUserRecord.id, { password: 'AnotherStrongPass123!' });

      expect(prismaServiceMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: createdUserRecord.id },
          data: expect.objectContaining({
            passwordHash: 'reactivated_hashed_password',
            status: UserStatus.ACTIVE,
            isActive: true,
            passwordChangedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should map missing user to NotFoundException', async () => {
      const p2025Error = Object.assign(new Error('record not found'), { code: 'P2025' });
      Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
      prismaServiceMock.user.update.mockRejectedValue(p2025Error);

      await expect(service.update('missing-id', { email: 'x@aurora.local' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return active or pending users with passwordHash for login', async () => {
      prismaServiceMock.user.findFirst.mockResolvedValue({
        ...selectedUserRecord,
        passwordHash: 'hashed_password',
      });

      const result = await service.findByEmail(createdUserRecord.email);

      expect(prismaServiceMock.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: createdUserRecord.email,
          status: {
            not: UserStatus.REVOKED,
          },
        },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          hashedRefreshToken: true,
          role: true,
          status: true,
          isActive: true,
          did: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result.passwordHash).toBe('hashed_password');
    });

    it('should throw NotFoundException when user is revoked or does not exist', async () => {
      prismaServiceMock.user.findFirst.mockResolvedValue(null);

      await expect(service.findByEmail('revoked@aurora.local')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete user, anonymize email and keep DID', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: createdUserRecord.id,
        email: createdUserRecord.email,
        status: UserStatus.ACTIVE,
        did: 'did:firefly:custom/admin@aurora.local',
      });
      prismaServiceMock.user.update.mockResolvedValue({
        ...selectedUserRecord,
        email: `REVOKED_${createdUserRecord.id}`,
        status: UserStatus.REVOKED,
        isActive: false,
        did: 'did:firefly:custom/admin@aurora.local',
      });
      mailServiceMock.sendAccountDeletedEmail.mockResolvedValue(undefined);

      const result = await service.remove(createdUserRecord.id, createdUserRecord.id);

      expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: createdUserRecord.id },
        select: {
          id: true,
          email: true,
          status: true,
          did: true,
        },
      });
      expect(prismaServiceMock.user.update).toHaveBeenCalledWith({
        where: { id: createdUserRecord.id },
        data: {
          status: UserStatus.REVOKED,
          isActive: false,
          email: `REVOKED_${createdUserRecord.id}`,
          passwordHash: '*REVOKED_ACCOUNT*',
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          did: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result.status).toBe(UserStatus.REVOKED);
      expect(result.did).toBe('did:firefly:custom/admin@aurora.local');
      expect(result.email).toBe(`REVOKED_${createdUserRecord.id}`);
      expect(redisServiceMock.addToBlacklist).toHaveBeenCalledWith(createdUserRecord.id, 300);
      expect(mailServiceMock.sendAccountDeletedEmail).toHaveBeenCalledWith(
        createdUserRecord.email,
        expect.any(String),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id', 'missing-id')).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user is already revoked', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: createdUserRecord.id,
        email: `REVOKED_${createdUserRecord.id}`,
        status: UserStatus.REVOKED,
        did: 'did:firefly:custom/admin@aurora.local',
      });

      await expect(service.remove(createdUserRecord.id, createdUserRecord.id)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when requester is not self and not admin', async () => {
      await expect(
        service.remove(createdUserRecord.id, 'other-user-id', Role.USER),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaServiceMock.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('changeRole', () => {
    it('should throw ForbiddenException when trying to assign GLOBAL_ADMIN', async () => {
      await expect(service.changeRole(createdUserRecord.id, Role.GLOBAL_ADMIN)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
    });

    it('should update role when new role is allowed', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: createdUserRecord.id,
        email: createdUserRecord.email,
        role: Role.USER,
      });
      prismaServiceMock.user.update.mockResolvedValue({
        ...selectedUserRecord,
        role: Role.ADMIN,
      });
      mailServiceMock.sendRoleChangedEmail.mockResolvedValue(undefined);

      const result = await service.changeRole(createdUserRecord.id, Role.ADMIN);

      expect(prismaServiceMock.user.update).toHaveBeenCalledWith({
        where: { id: createdUserRecord.id },
        data: { role: Role.ADMIN },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          did: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(mailServiceMock.sendRoleChangedEmail).toHaveBeenCalledWith(
        createdUserRecord.email,
        Role.ADMIN,
        Role.USER,
      );
      expect(result.role).toBe(Role.ADMIN);
    });

    it('should map missing user to NotFoundException', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(service.changeRole('missing-id', Role.ADMIN)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe('approveUser', () => {
    it('should approve user in PENDING, assign DID from FireFly and send verify email', async () => {
      const adminDid = 'did:firefly:custom/admin@aurora.local';
      const issuedDid = `did:firefly:custom/${createdUserRecord.email}`;

      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: createdUserRecord.id,
        email: createdUserRecord.email,
        status: UserStatus.PENDING,
      });
      fireflyServiceMock.createIdentity.mockResolvedValue(issuedDid);
      prismaServiceMock.user.update.mockResolvedValue({
        ...selectedUserRecord,
        status: UserStatus.ACTIVE,
        isActive: true,
        did: issuedDid,
      });
      mailServiceMock.sendVerifyEmail.mockResolvedValue(undefined);

      const result = await service.approveUser(createdUserRecord.id, adminDid);

      expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: createdUserRecord.id },
        select: {
          id: true,
          email: true,
          status: true,
        },
      });
      expect(fireflyServiceMock.createIdentity).toHaveBeenCalledWith({
        name: createdUserRecord.email,
        parent: adminDid,
      });
      expect(prismaServiceMock.user.update).toHaveBeenCalledWith({
        where: { id: createdUserRecord.id },
        data: {
          status: UserStatus.ACTIVE,
          isActive: true,
          did: issuedDid,
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isActive: true,
          did: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(mailServiceMock.sendVerifyEmail).toHaveBeenCalledWith(
        createdUserRecord.email,
        'http://localhost/reset-password?token=mock-token',
      );
      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.approveUser('missing-id', 'did:firefly:custom/admin@aurora.local'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(fireflyServiceMock.createIdentity).not.toHaveBeenCalled();
      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
      expect(mailServiceMock.sendVerifyEmail).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user is not PENDING', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: createdUserRecord.id,
        email: createdUserRecord.email,
        status: UserStatus.ACTIVE,
      });

      await expect(
        service.approveUser(createdUserRecord.id, 'did:firefly:custom/admin@aurora.local'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(fireflyServiceMock.createIdentity).not.toHaveBeenCalled();
      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
      expect(mailServiceMock.sendVerifyEmail).not.toHaveBeenCalled();
    });

    it('should propagate mail errors after activation update', async () => {
      const issuedDid = `did:firefly:custom/${createdUserRecord.email}`;

      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: createdUserRecord.id,
        email: createdUserRecord.email,
        status: UserStatus.PENDING,
      });
      fireflyServiceMock.createIdentity.mockResolvedValue(issuedDid);
      prismaServiceMock.user.update.mockResolvedValue({
        ...selectedUserRecord,
        status: UserStatus.ACTIVE,
        isActive: true,
        did: issuedDid,
      });
      mailServiceMock.sendVerifyEmail.mockRejectedValue(new Error('smtp down'));

      await expect(
        service.approveUser(createdUserRecord.id, 'did:firefly:custom/admin@aurora.local'),
      ).rejects.toThrow('smtp down');
    });

    it('should propagate FireFly identity errors and avoid activation update', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: createdUserRecord.id,
        email: createdUserRecord.email,
        status: UserStatus.PENDING,
      });
      fireflyServiceMock.createIdentity.mockRejectedValue(new Error('firefly down'));

      await expect(
        service.approveUser(createdUserRecord.id, 'did:firefly:custom/admin@aurora.local'),
      ).rejects.toThrow('firefly down');
      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
      expect(mailServiceMock.sendVerifyEmail).not.toHaveBeenCalled();
    });
  });

  describe('createPasswordResetToken', () => {
    it('should generate unique token, hash it and send recover email', async () => {
      const rawTokenBuffer = Buffer.from('reset-token-1234567890');
      const rawToken = rawTokenBuffer.toString('base64url');

      process.env.PASSWORD_RESET_ACTION_URL = 'http://localhost:5173/reset';
      prismaServiceMock.user.findFirst.mockResolvedValue({
        id: createdUserRecord.id,
        email: createdUserRecord.email,
      });
      mockRandomBytes.mockReturnValue(rawTokenBuffer as never);
      prismaServiceMock.passwordResetToken.findUnique.mockResolvedValue(null);
      prismaServiceMock.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      mockHash.mockResolvedValue('hashed_reset_token' as never);
      prismaServiceMock.passwordResetToken.create.mockResolvedValue({
        id: 'd32f0f8f-b57f-4b3a-90e5-74f0cd37f7c4',
      });
      mailServiceMock.sendRecoverEmail.mockResolvedValue(undefined);

      await service.createPasswordResetToken(createdUserRecord.email);

      expect(prismaServiceMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: createdUserRecord.id,
          usedAt: null,
        },
        data: {
          usedAt: expect.any(Date),
        },
      });
      expect(prismaServiceMock.passwordResetToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: createdUserRecord.id,
          tokenHash: 'hashed_reset_token',
          createdAt: expect.any(Date),
        }),
      });
      expect(mailServiceMock.sendRecoverEmail).toHaveBeenCalledWith(
        createdUserRecord.email,
        `http://localhost:5173/reset?token=${encodeURIComponent(rawToken)}`,
      );
    });

    it('should return silently when user does not exist', async () => {
      prismaServiceMock.user.findFirst.mockResolvedValue(null);

      await service.createPasswordResetToken('missing@aurora.local');

      expect(prismaServiceMock.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mailServiceMock.sendRecoverEmail).not.toHaveBeenCalled();
    });
  });

  describe('consumePasswordResetToken', () => {
    it('should reject used tokens', async () => {
      const now = new Date();
      prismaServiceMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'used-token-id',
        userId: createdUserRecord.id,
        tokenHash: 'stored_hash',
        createdAt: now,
        usedAt: now,
      });

      await expect(
        service.consumePasswordResetToken('raw-token', 'NewPassword123!'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
      expect(prismaServiceMock.passwordResetToken.update).not.toHaveBeenCalled();
    });

    it('should consume valid token, update password and mark token as used', async () => {
      const createdAt = new Date(Date.now() - 60 * 1000);
      prismaServiceMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'valid-token-id',
        userId: createdUserRecord.id,
        tokenHash: 'stored_hash',
        createdAt,
        usedAt: null,
      });
      mockVerify.mockResolvedValue(true as never);
      mockHash.mockResolvedValue('new_password_hash' as never);
      prismaServiceMock.user.update.mockResolvedValue(selectedUserRecord);
      prismaServiceMock.passwordResetToken.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await service.consumePasswordResetToken('raw-token', 'NewPassword123!');

      expect(mockVerify).toHaveBeenCalledWith('stored_hash', 'raw-token');
      expect(prismaServiceMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: createdUserRecord.id },
          data: expect.objectContaining({
            passwordHash: 'new_password_hash',
            status: UserStatus.ACTIVE,
            isActive: true,
            passwordChangedAt: expect.any(Date),
            hashedRefreshToken: null,
          }),
        }),
      );
      expect(prismaServiceMock.passwordResetToken.updateMany).toHaveBeenNthCalledWith(1, {
        where: {
          id: 'valid-token-id',
          usedAt: null,
          createdAt: {
            gte: expect.any(Date),
          },
        },
        data: { usedAt: expect.any(Date) },
      });
      expect(prismaServiceMock.passwordResetToken.updateMany).toHaveBeenNthCalledWith(2, {
        where: {
          userId: createdUserRecord.id,
          usedAt: null,
        },
        data: { usedAt: expect.any(Date) },
      });
      expect(prismaServiceMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should reject when consume cannot atomically mark token as used', async () => {
      const createdAt = new Date(Date.now() - 60 * 1000);
      prismaServiceMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'valid-token-id',
        userId: createdUserRecord.id,
        tokenHash: 'stored_hash',
        createdAt,
        usedAt: null,
      });
      mockVerify.mockResolvedValue(true as never);
      mockHash.mockResolvedValue('new_password_hash' as never);
      prismaServiceMock.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(
        service.consumePasswordResetToken('raw-token', 'NewPassword123!'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should return valid=true for an active non-expired token', async () => {
      const createdAt = new Date(Date.now() - 60 * 1000);
      prismaServiceMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'valid-token-id',
        userId: createdUserRecord.id,
        tokenHash: 'stored_hash',
        createdAt,
        usedAt: null,
      });
      mockVerify.mockResolvedValue(true as never);

      const result = await service.validatePasswordResetToken('raw-token');

      expect(result).toEqual({ valid: true });
    });

    it('should return valid=false for missing/invalid token', async () => {
      prismaServiceMock.passwordResetToken.findUnique.mockResolvedValue(null);

      const result = await service.validatePasswordResetToken('raw-token');

      expect(result).toEqual({ valid: false });
    });
  });
});