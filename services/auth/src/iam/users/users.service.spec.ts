import { ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

jest.mock('argon2', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: {
    user: {
      findUnique: ReturnType<typeof jest.fn>;
      create: ReturnType<typeof jest.fn>;
    };
  };

  const mockHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>;

  const createUserDto: CreateUserDto = {
    email: 'admin@aurora.local',
    password: 'Admin123!',
    did: 'did:firefly:org-aurora:user:admin-001',
    isActive: true,
  };

  const createdUserRecord = {
    id: 'a4a98bc5-a6a3-4e13-8cb7-4f2cbf3a4c75',
    email: createUserDto.email,
    passwordHash: 'argon2$hash',
    role: 'OWNER',
    did: createUserDto.did,
    isActive: createUserDto.isActive,
    createdAt: new Date('2026-04-13T10:00:00.000Z'),
    updatedAt: new Date('2026-04-13T10:00:00.000Z'),
  };

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    service = new UsersService(prismaMock as unknown as PrismaService);
    jest.clearAllMocks();
  });

  it('should hash password and create user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue('argon2$hash' as never);
    prismaMock.user.create.mockResolvedValue(createdUserRecord);

    await service.create(createUserDto);

    expect(mockHash).toHaveBeenCalledWith(createUserDto.password);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        email: createUserDto.email,
        passwordHash: 'argon2$hash',
        role: createUserDto.role,
        did: createUserDto.did,
        isActive: createUserDto.isActive,
      },
    });

    const prismaCreateArg = prismaMock.user.create.mock.calls[0][0];
    expect(prismaCreateArg.data.passwordHash).not.toBe(createUserDto.password);
  });

  it('should throw ConflictException', async () => {
    prismaMock.user.findUnique.mockResolvedValue(createdUserRecord);

    await expect(service.create(createUserDto)).rejects.toBeInstanceOf(ConflictException);

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
  });

  it('should sanitize output', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue('argon2$hash' as never);
    prismaMock.user.create.mockResolvedValue(createdUserRecord);

    const result = await service.create(createUserDto);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).toMatchObject({
      id: createdUserRecord.id,
      email: createdUserRecord.email,
      role: createdUserRecord.role,
      did: createdUserRecord.did,
      isActive: createdUserRecord.isActive,
    });
  });
});
