import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { randomBytes } from 'crypto';
import { MailService } from '../../shared/mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

jest.mock('argon2', () => ({
  hash: jest.fn(),
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
      findMany: ReturnType<typeof jest.fn>;
      create: ReturnType<typeof jest.fn>;
      update: ReturnType<typeof jest.fn>;
      delete: ReturnType<typeof jest.fn>;
    };
  };
  let mailServiceMock: {
    sendWelcomeEmail: ReturnType<typeof jest.fn>;
    sendVerifyEmail: ReturnType<typeof jest.fn>;
  };

  const mockHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>;
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
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          }),
        },
        {
          provide: MailService,
          useFactory: () => ({
            sendWelcomeEmail: jest.fn(),
            sendVerifyEmail: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaServiceMock = module.get(PrismaService) as unknown as typeof prismaServiceMock;
    mailServiceMock = module.get(MailService) as unknown as typeof mailServiceMock;
    jest.clearAllMocks();
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
        data: {
          email: 'updated@aurora.local',
          passwordHash: 'new_hashed_password',
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
      expect(result).toEqual({
        ...selectedUserRecord,
        email: 'updated@aurora.local',
      });
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

  describe('remove', () => {
    it('should delete user and return deleted record', async () => {
      prismaServiceMock.user.delete.mockResolvedValue(selectedUserRecord);

      const result = await service.remove(createdUserRecord.id);

      expect(prismaServiceMock.user.delete).toHaveBeenCalledWith({
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

    it('should map missing user to NotFoundException', async () => {
      const p2025Error = Object.assign(new Error('record not found'), { code: 'P2025' });
      Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
      prismaServiceMock.user.delete.mockRejectedValue(p2025Error);

      await expect(service.remove('missing-id')).rejects.toBeInstanceOf(NotFoundException);
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
      prismaServiceMock.user.update.mockResolvedValue({
        ...selectedUserRecord,
        role: Role.ADMIN,
      });

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
      expect(result.role).toBe(Role.ADMIN);
    });

    it('should map missing user to NotFoundException', async () => {
      const p2025Error = Object.assign(new Error('record not found'), { code: 'P2025' });
      Object.setPrototypeOf(p2025Error, Prisma.PrismaClientKnownRequestError.prototype);
      prismaServiceMock.user.update.mockRejectedValue(p2025Error);

      await expect(service.changeRole('missing-id', Role.ADMIN)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('approveUser', () => {
    it('should approve user in PENDING, assign mock DID and send verify email', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: createdUserRecord.id,
        email: createdUserRecord.email,
        status: UserStatus.PENDING,
      });
      prismaServiceMock.user.update.mockResolvedValue({
        ...selectedUserRecord,
        status: UserStatus.ACTIVE,
        isActive: true,
        did: `did:firefly:custom/${createdUserRecord.email}`,
      });
      mailServiceMock.sendVerifyEmail.mockResolvedValue(undefined);

      const result = await service.approveUser(
        createdUserRecord.id,
        'did:firefly:custom/admin@aurora.local',
      );

      expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: createdUserRecord.id },
        select: {
          id: true,
          email: true,
          status: true,
        },
      });
      expect(prismaServiceMock.user.update).toHaveBeenCalledWith({
        where: { id: createdUserRecord.id },
        data: {
          status: UserStatus.ACTIVE,
          isActive: true,
          did: `did:firefly:custom/${createdUserRecord.email}`,
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

      await expect(service.approveUser('missing-id')).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
      expect(mailServiceMock.sendVerifyEmail).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user is not PENDING', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: createdUserRecord.id,
        email: createdUserRecord.email,
        status: UserStatus.ACTIVE,
      });

      await expect(service.approveUser(createdUserRecord.id)).rejects.toBeInstanceOf(ConflictException);
      expect(prismaServiceMock.user.update).not.toHaveBeenCalled();
      expect(mailServiceMock.sendVerifyEmail).not.toHaveBeenCalled();
    });

    it('should propagate mail errors after activation update', async () => {
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: createdUserRecord.id,
        email: createdUserRecord.email,
        status: UserStatus.PENDING,
      });
      prismaServiceMock.user.update.mockResolvedValue({
        ...selectedUserRecord,
        status: UserStatus.ACTIVE,
        isActive: true,
        did: `did:firefly:custom/${createdUserRecord.email}`,
      });
      mailServiceMock.sendVerifyEmail.mockRejectedValue(new Error('smtp down'));

      await expect(service.approveUser(createdUserRecord.id)).rejects.toThrow('smtp down');
    });
  });
});