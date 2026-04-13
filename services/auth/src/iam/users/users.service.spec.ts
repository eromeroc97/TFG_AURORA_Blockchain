import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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
  let prismaServiceMock: {
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
    passwordHash: 'hashed_password',
    role: 'OWNER',
    did: createUserDto.did,
    isActive: createUserDto.isActive,
    createdAt: new Date('2026-04-13T10:00:00.000Z'),
    updatedAt: new Date('2026-04-13T10:00:00.000Z'),
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
              create: jest.fn(),
            },
          }),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaServiceMock = module.get(PrismaService) as unknown as typeof prismaServiceMock;
    jest.clearAllMocks();
  });

  it('should hash password and create user', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue('hashed_password' as never);
    prismaServiceMock.user.create.mockResolvedValue(createdUserRecord);

    const result = await service.create(createUserDto);

    expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: createUserDto.email },
    });
    expect(mockHash).toHaveBeenCalledWith(createUserDto.password);
    expect(prismaServiceMock.user.create).toHaveBeenCalledWith({
      data: {
        email: createUserDto.email,
        passwordHash: 'hashed_password',
        role: createUserDto.role,
        did: createUserDto.did,
        isActive: createUserDto.isActive,
      },
    });

    const findUniqueCallOrder = prismaServiceMock.user.findUnique.mock.invocationCallOrder[0];
    const hashCallOrder = mockHash.mock.invocationCallOrder[0];
    const createCallOrder = prismaServiceMock.user.create.mock.invocationCallOrder[0];

    expect(findUniqueCallOrder).toBeLessThan(hashCallOrder);
    expect(hashCallOrder).toBeLessThan(createCallOrder);

    const prismaCreateArg = prismaServiceMock.user.create.mock.calls[0][0];
    expect(prismaCreateArg.data.passwordHash).not.toBe(createUserDto.password);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).toMatchObject({
      id: createdUserRecord.id,
      email: createdUserRecord.email,
      role: createdUserRecord.role,
      did: createdUserRecord.did,
      isActive: createdUserRecord.isActive,
    });
  });

  it('should throw ConflictException', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(createdUserRecord);

    await expect(service.create(createUserDto)).rejects.toBeInstanceOf(ConflictException);

    expect(prismaServiceMock.user.create).not.toHaveBeenCalled();
    expect(mockHash).not.toHaveBeenCalled();
  });

  it('should throw InternalServerErrorException when database creation fails', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue('hashed_password' as never);
    prismaServiceMock.user.create.mockRejectedValue(new Error('database unavailable'));

    await expect(service.create(createUserDto)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
